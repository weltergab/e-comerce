import '../lib/config/env';
import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import { stripe } from '../lib/stripe/client';
import { authenticateAdmin, authenticateRequest } from '../lib/auth/middleware';
import { signToken } from '../lib/auth/jwt';
import { updateStock } from '../lib/services/stock';
import { syncAllPendingTransactions, syncTransactionStatus } from '../lib/services/transactions';
import { supabase } from '../lib/supabase/client';

const app = express();
const port = Number(process.env.PORT || 3001);
const normalizeOrigin = (origin: string) => origin.trim().replace(/\/$/, '');
const frontendUrl = process.env.VERCEL
  ? process.env.FRONTEND_URL
  : process.env.FRONTEND_LOCAL_URL;
const frontUrl = normalizeOrigin(frontendUrl || 'http://localhost:5173');
const corsOrigins = new Set(
  [frontUrl, ...(process.env.CORS_ORIGINS || '').split(',')]
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean)
);
const sendError = (res: Response, status: number, error: string) =>
  res.status(status).json({ error });

app.use((req, res, next) => {
  const origin = req.headers.origin ? normalizeOrigin(req.headers.origin) : null;

  if (!origin) {
    res.header('Access-Control-Allow-Origin', frontUrl);
  } else if (corsOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature, Cache-Control');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/api/health', (_req, res) => {
  const requiredEnv = [
    process.env.VERCEL ? 'FRONTEND_URL' : 'FRONTEND_LOCAL_URL',
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  res.json({
    ok: requiredEnv.every((key) => Boolean(process.env[key])),
    service: 'storecy-backend',
    checkedAt: new Date().toISOString(),
    env: Object.fromEntries(requiredEnv.map((key) => [key, Boolean(process.env[key])])),
    cors: {
      frontUrl,
      origins: [...corsOrigins],
    },
  });
});

const formatStripeProduct = async (product: Stripe.Product) => {
  let priceData: { id: string; unit_amount: number | null; currency: string } | null = null;
  const defaultPrice = product.default_price;

  if (defaultPrice) {
    const price =
      typeof defaultPrice === 'string'
        ? await stripe.prices.retrieve(defaultPrice)
        : defaultPrice;
    priceData = {
      id: price.id,
      unit_amount: price.unit_amount,
      currency: price.currency,
    };
  } else {
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
    const price = prices.data[0];
    if (price) {
      priceData = {
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
      };
    }
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    image: product.images[0] || '',
    images: product.images,
    active: product.active,
    category: product.metadata?.category || 'Geral',
    stock: parseInt(product.metadata?.stock || '0', 10),
    stripePriceId: priceData?.id || '',
    metadata: product.metadata,
    price: priceData,
  };
};

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || Array.isArray(signature)) return sendError(res, 400, 'No signature');
  if (!webhookSecret) return sendError(res, 500, 'Webhook secret not configured');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err: any) {
    return sendError(res, 400, `Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.created' || event.type === 'payment_intent.processing') {
      await upsertTransaction(event.data.object as Stripe.PaymentIntent);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const result = await upsertTransaction(paymentIntent, 'succeeded');
      if (result.previousStatus !== 'succeeded') {
        const products = JSON.parse(paymentIntent.metadata.products || '[]');
        for (const item of products) await updateStock(item.id, item.qty);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    sendError(res, 500, 'Webhook handler failed');
  }
});

app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return sendError(res, 400, 'Email/Username e senha são obrigatórios');
    }

    const field = emailOrUsername.includes('@') ? 'email' : 'username';
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq(field, emailOrUsername.toLowerCase())
      .single();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return sendError(res, 401, 'Credenciais inválidas');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.is_admin || false,
    };

    res.json({
      success: true,
      token: signToken(payload),
      user: { id: user.id, email: user.email, username: user.username, isAdmin: payload.isAdmin },
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 500, 'Erro ao processar login');
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return sendError(res, 400, 'Todos os campos são obrigatórios');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 400, 'Email inválido');
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return sendError(res, 400, 'Username deve conter apenas letras e números, sem espaços ou acentos');
    }
    if (username.length < 3 || username.length > 50) return sendError(res, 400, 'Username deve ter entre 3 e 50 caracteres');
    if (password.length < 6) return sendError(res, 400, 'Senha deve ter no mínimo 6 caracteres');

    const { data: existingEmail, error: existingEmailError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (existingEmailError) {
      console.error('Error checking existing email:', existingEmailError);
      return sendError(res, 500, existingEmailError.message || 'Erro ao verificar email');
    }
    if (existingEmail) return sendError(res, 409, 'Email já cadastrado');

    const { data: existingUsername, error: existingUsernameError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    if (existingUsernameError) {
      console.error('Error checking existing username:', existingUsernameError);
      return sendError(res, 500, existingUsernameError.message || 'Erro ao verificar username');
    }
    if (existingUsername) return sendError(res, 409, 'Username já cadastrado');

    const passwordHash = await bcrypt.hash(password, 10);
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ email: email.toLowerCase(), username: username.toLowerCase(), password_hash: passwordHash }])
      .select()
      .single();

    if (error || !newUser) {
      console.error('Error creating user:', error);
      return sendError(res, 500, error?.message || 'Erro ao criar usuário');
    }

    const payload = {
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username,
      isAdmin: newUser.is_admin || false,
    };

    res.json({
      success: true,
      token: signToken(payload),
      user: { id: newUser.id, email: newUser.email, username: newUser.username, isAdmin: payload.isAdmin },
    });
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 500, 'Erro ao processar cadastro');
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = authenticateRequest(req);
  if (!user) return sendError(res, 401, 'Não autenticado');
  res.json({ user: { id: user.userId, email: user.email, username: user.username, isAdmin: user.isAdmin || false } });
});

app.get('/api/products', async (_req, res) => {
  try {
    const products = await stripe.products.list({ active: true, expand: ['data.default_price'] });
    const formatted = await Promise.all(products.data.map(formatStripeProduct));
    res.json({
      success: true,
      products: formatted.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price?.unit_amount ? p.price.unit_amount / 100 : 0,
        image: p.image,
        category: p.category,
        stock: p.stock,
        stripePriceId: p.stripePriceId,
      })),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    sendError(res, 500, 'Erro ao buscar produtos');
  }
});

app.get('/api/stock', async (_req, res) => {
  try {
    const products = await stripe.products.list({ active: true });
    const stock = Object.fromEntries(products.data.map((product) => [product.id, parseInt(product.metadata?.stock || '0', 10)]));
    res.json({ stock });
  } catch (error) {
    console.error('Error fetching stock:', error);
    sendError(res, 500, 'Failed to fetch stock');
  }
});

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const user = authenticateRequest(req);
    if (!user) return sendError(res, 401, 'Não autenticado');

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return sendError(res, 400, 'Invalid cart items');
    if (items.some((item: any) => !item.price || item.price <= 0)) {
      return sendError(res, 400, 'Alguns produtos não têm preço válido');
    }

    const amount = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    if (amount <= 0) return sendError(res, 400, 'Valor total inválido');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'brl',
      description: items.map((item: any) => `${item.quantity}x Produto ID: ${item.productId}`).join(', ').substring(0, 1000),
      payment_method_types: ['card', 'boleto'],
      payment_method_options: { boleto: { expires_after_days: 3 } },
      metadata: {
        userId: user.userId,
        userEmail: user.email,
        userName: user.username,
        itemCount: items.length.toString(),
        products: JSON.stringify(items.map((item: any) => ({ id: item.productId, qty: item.quantity, price: item.price }))),
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('Payment Intent Error:', error);
    sendError(res, 500, error.message || 'Failed to create payment intent');
  }
});

app.post('/api/confirm-payment-intent', async (req, res) => {
  try {
    const user = authenticateRequest(req);
    if (!user) return sendError(res, 401, 'Não autenticado');

    const { paymentIntentId } = req.body;
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return sendError(res, 400, 'Payment Intent inválido');
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.metadata.userId !== user.userId) {
      return sendError(res, 403, 'Pagamento não pertence ao usuário autenticado');
    }

    const result = await upsertTransaction(
      paymentIntent,
      paymentIntent.status === 'succeeded' ? 'succeeded' : undefined
    );

    if (paymentIntent.status === 'succeeded' && result.previousStatus !== 'succeeded') {
      const products = JSON.parse(paymentIntent.metadata.products || '[]');
      for (const item of products) await updateStock(item.id, item.qty);
    }

    res.json({
      success: true,
      status: paymentIntent.status,
    });
  } catch (error: any) {
    console.error('Confirm Payment Intent Error:', error);
    sendError(res, 500, error.message || 'Erro ao confirmar pagamento');
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return sendError(res, 400, 'Invalid cart items');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({ price: item.stripePriceId, quantity: item.quantity })),
      mode: 'payment',
      success_url: `${frontUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontUrl}/cart`,
      metadata: {
        cartData: JSON.stringify(items.map((item: any) => ({ productId: item.productId, quantity: item.quantity }))),
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout Session Error:', error);
    sendError(res, 500, 'Failed to create checkout session');
  }
});

app.get('/api/admin/products', async (req, res) => {
  if (!authenticateAdmin(req)) return sendError(res, 403, 'Acesso negado. Apenas administradores.');

  try {
    const products = await stripe.products.list({ active: true, expand: ['data.default_price'] });
    const formattedProducts = await Promise.all(products.data.map(formatStripeProduct));
    res.json({ success: true, products: formattedProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    sendError(res, 500, 'Erro ao buscar produtos');
  }
});

app.get('/api/admin/health', async (req, res) => {
  if (!authenticateAdmin(req)) return sendError(res, 403, 'Acesso negado. Apenas administradores.');

  const checkedAt = new Date().toISOString();

  const backend = {
    ok: true,
    label: 'Backend Express',
    message: 'API respondendo',
    checkedAt,
    uptimeSeconds: Math.round(process.uptime()),
  };

  const database = {
    ok: false,
    label: 'Supabase',
    message: '',
    checkedAt,
  };

  const stripeStatus = {
    ok: false,
    label: 'Stripe',
    message: '',
    checkedAt,
    mode: 'unknown',
  };

  try {
    const { error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (error) {
      database.message = error.message || 'Erro ao consultar o Supabase';
    } else {
      database.ok = true;
      database.message = 'Banco respondendo';
    }
  } catch (error: any) {
    database.message = error.message || 'Erro ao conectar ao Supabase';
  }

  try {
    const balance = await stripe.balance.retrieve();
    stripeStatus.ok = true;
    stripeStatus.message = 'Stripe respondendo';
    stripeStatus.mode = balance.livemode ? 'live' : 'test';
  } catch (error: any) {
    stripeStatus.message = error.message || 'Erro ao conectar a Stripe';
  }

  res.json({
    ok: backend.ok && database.ok && stripeStatus.ok,
    checkedAt,
    services: {
      backend,
      database,
      stripe: stripeStatus,
    },
  });
});

app.post('/api/admin/products', async (req, res) => {
  if (!authenticateAdmin(req)) return sendError(res, 403, 'Acesso negado. Apenas administradores.');

  try {
    const { name, description, price, currency = 'brl', images, stock } = req.body;
    if (!name || !price) return sendError(res, 400, 'Nome e preço são obrigatórios');
    if (price <= 0) return sendError(res, 400, 'Preço deve ser maior que zero');

    const product = await stripe.products.create({
      name,
      description: description || undefined,
      images: images || [],
      metadata: { stock: stock?.toString() || '0' },
    });
    const priceObj = await stripe.prices.create({ product: product.id, unit_amount: Math.round(price * 100), currency });
    await stripe.products.update(product.id, { default_price: priceObj.id });

    res.json({ success: true, product: await formatStripeProduct({ ...product, default_price: priceObj } as Stripe.Product) });
  } catch (error) {
    console.error('Error creating product:', error);
    sendError(res, 500, 'Erro ao criar produto');
  }
});

app.get('/api/admin/products/:id', async (req, res) => {
  if (!authenticateAdmin(req)) return sendError(res, 403, 'Acesso negado. Apenas administradores.');

  try {
    const product = await stripe.products.retrieve(req.params.id, { expand: ['default_price'] });
    res.json({ success: true, product: await formatStripeProduct(product) });
  } catch (error) {
    console.error('Error fetching product:', error);
    sendError(res, 500, 'Erro ao buscar produto');
  }
});

app.put('/api/admin/products/:id', async (req, res) => {
  if (!authenticateAdmin(req)) return sendError(res, 403, 'Acesso negado. Apenas administradores.');

  try {
    const { name, description, images, price, stock, active } = req.body;
    const updateData: Stripe.ProductUpdateParams = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (images !== undefined) updateData.images = images;
    if (active !== undefined) updateData.active = active;
    if (stock !== undefined) updateData.metadata = { stock: stock.toString() };
    await stripe.products.update(req.params.id, updateData);

    if (price !== undefined && price > 0) {
      const currentProduct = await stripe.products.retrieve(req.params.id);
      const currentPriceId =
        typeof currentProduct.default_price === 'string'
          ? currentProduct.default_price
          : currentProduct.default_price?.id;
      let shouldUpdatePrice = true;
      let currency = 'brl';

      if (currentPriceId) {
        const currentPrice = await stripe.prices.retrieve(currentPriceId);
        currency = currentPrice.currency;
        shouldUpdatePrice = (currentPrice.unit_amount || 0) !== Math.round(price * 100);
      }

      if (shouldUpdatePrice) {
        const newPrice = await stripe.prices.create({ product: req.params.id, unit_amount: Math.round(price * 100), currency });
        await stripe.products.update(req.params.id, { default_price: newPrice.id });
        if (currentPriceId) await stripe.prices.update(currentPriceId, { active: false });
      }
    }

    const updatedProduct = await stripe.products.retrieve(req.params.id, { expand: ['default_price'] });
    res.json({ success: true, product: await formatStripeProduct(updatedProduct) });
  } catch (error) {
    console.error('Error updating product:', error);
    sendError(res, 500, 'Erro ao atualizar produto');
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  if (!authenticateAdmin(req)) return sendError(res, 403, 'Acesso negado. Apenas administradores.');

  try {
    await stripe.products.update(req.params.id, { active: false });
    res.json({ success: true, message: 'Produto arquivado com sucesso' });
  } catch (error) {
    console.error('Error deleting product:', error);
    sendError(res, 500, 'Erro ao excluir produto');
  }
});

app.get('/api/my-transactions', async (req, res) => {
  const user = authenticateRequest(req);
  if (!user) return sendError(res, 401, 'Não autenticado');

  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (error || !transactions) return sendError(res, 500, 'Erro ao buscar transações');

    for (const transaction of transactions.filter((t: any) => t.status !== 'succeeded' && t.status !== 'canceled')) {
      await syncTransactionStatus(transaction.stripe_payment_intent_id);
    }

    const { data: updatedTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    res.json({ transactions: (updatedTransactions || []).map(formatTransaction), total: updatedTransactions?.length || 0 });
  } catch (error: any) {
    console.error('Error in my-transactions API:', error);
    sendError(res, 500, error.message || 'Erro ao processar requisição');
  }
});

app.get('/api/admin/transactions', async (req, res) => {
  const user = authenticateRequest(req);
  if (!user) return sendError(res, 401, 'Não autenticado');

  try {
    const { data: userData } = await supabase.from('users').select('is_admin').eq('id', user.userId).single();
    if (!userData?.is_admin) return sendError(res, 403, 'Acesso negado. Apenas administradores.');

    await syncAllPendingTransactions();
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !transactions) return sendError(res, 500, 'Erro ao buscar transações');
    res.json({ transactions: transactions.map(formatTransaction), total: transactions.length });
  } catch (error: any) {
    console.error('Error in transactions API:', error);
    sendError(res, 500, error.message || 'Erro ao processar requisição');
  }
});

app.patch('/api/admin/transactions/:id', async (req, res) => {
  const user = authenticateRequest(req);
  if (!user) return sendError(res, 401, 'Não autenticado');

  try {
    const { data: userData } = await supabase.from('users').select('is_admin, email').eq('id', user.userId).single();
    if (!userData?.is_admin) return sendError(res, 403, 'Acesso negado. Apenas administradores.');
    const { adminNotes } = req.body;
    if (adminNotes !== null && adminNotes !== undefined && typeof adminNotes !== 'string') {
      return sendError(res, 400, 'Notas devem ser uma string');
    }

    const { data: transaction } = await supabase
      .from('transactions')
      .select('stripe_payment_intent_id')
      .eq('id', req.params.id)
      .single();
    if (!transaction) return sendError(res, 404, 'Transação não encontrada');

    const notesValue = adminNotes ? adminNotes.trim() : null;
    const now = notesValue ? new Date().toISOString() : null;
    const { data: updatedTransaction, error } = await supabase
      .from('transactions')
      .update({
        admin_notes: notesValue,
        admin_notes_updated_at: now,
        admin_notes_updated_by: notesValue ? user.userId : null,
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return sendError(res, 500, 'Erro ao atualizar transação');

    await stripe.paymentIntents.update(transaction.stripe_payment_intent_id, {
      metadata: {
        admin_notes: notesValue || '',
        admin_notes_updated_at: now || '',
        admin_notes_updated_by: notesValue ? userData.email : '',
      },
    }).catch((stripeError) => console.error('Error updating Stripe metadata:', stripeError));

    res.json({ success: true, transaction: { ...updatedTransaction, adminNotesUpdatedBy: userData.email } });
  } catch (error: any) {
    console.error('Error in transaction update:', error);
    sendError(res, 500, error.message || 'Erro ao processar requisição');
  }
});

function formatTransaction(transaction: any) {
  return {
    id: transaction.id,
    userEmail: transaction.user_email,
    userName: transaction.user_name || 'Usuário desconhecido',
    stripePaymentIntentId: transaction.stripe_payment_intent_id,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status,
    paymentMethod: transaction.payment_method,
    boletoUrl: transaction.boleto_url,
    products: transaction.products,
    createdAt: transaction.created_at,
    updatedAt: transaction.updated_at,
    adminNotes: transaction.admin_notes,
    adminNotesUpdatedAt: transaction.admin_notes_updated_at,
    adminNotesUpdatedBy: transaction.admin_notes_updated_by || null,
  };
}

async function upsertTransaction(paymentIntent: Stripe.PaymentIntent, forcedStatus?: string) {
  const products = JSON.parse(paymentIntent.metadata.products || '[]');
  const paymentMethod = paymentIntent.payment_method
    ? await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string)
    : null;
  const paymentMethodType =
    paymentMethod?.type ||
    (paymentIntent.next_action?.type === 'boleto_display_details' ? 'boleto' : null);
  const boletoUrl =
    paymentIntent.next_action?.type === 'boleto_display_details'
      ? paymentIntent.next_action.boleto_display_details?.hosted_voucher_url || null
      : null;

  const { data: existing } = await supabase
    .from('transactions')
    .select('id, status')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .maybeSingle();

  const transactionData = {
    user_id: paymentIntent.metadata.userId || null,
    user_email: paymentIntent.metadata.userEmail || 'unknown',
    user_name: paymentIntent.metadata.userName || 'Usuário desconhecido',
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: forcedStatus || paymentIntent.status,
    payment_method: paymentMethodType,
    boleto_url: boletoUrl,
    products,
  };

  if (existing) {
    await supabase
      .from('transactions')
      .update({
        status: transactionData.status,
        payment_method: transactionData.payment_method,
        boleto_url: transactionData.boleto_url,
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
  } else {
    await supabase.from('transactions').insert(transactionData);
  }

  return {
    existed: Boolean(existing),
    previousStatus: existing?.status || null,
    currentStatus: transactionData.status,
  };
}

export function startServer() {
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}

export default app;
