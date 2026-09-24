import { Route, Routes } from 'react-router-dom';
import { CartProvider } from '@/contexts/CartContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppLayout } from '@/components/layout/AppLayout';
import Home from '@/src/pages/Home';
import Login from '@/src/pages/Login';
import Cadastro from '@/src/pages/Cadastro';
import Cart from '@/src/pages/Cart';
import Checkout from '@/src/pages/Checkout';
import CheckoutSuccess from '@/src/pages/checkout/success/CheckoutSuccess';
import Product from '@/src/pages/products/Product';
import Admin from '@/src/pages/admin/Admin';
import AdminOrders from '@/src/pages/admin/orders/Orders';
import MyOrders from '@/src/pages/MyOrders';
import PasswordReset from '@/src/pages/PasswordReset';
import { RequireAdmin, RequireAuth } from '@/src/app/guards';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/forgot-password" element={<PasswordReset />} />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
              <Route path="/checkout/success" element={<RequireAuth><CheckoutSuccess /></RequireAuth>} />
              <Route path="/products/:id" element={<Product />} />
              <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
              <Route path="/admin/orders" element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
              <Route path="/my-orders" element={<RequireAuth><MyOrders /></RequireAuth>} />
            </Routes>
          </AppLayout>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
