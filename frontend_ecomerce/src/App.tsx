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
import Transactions from '@/src/pages/admin/transactions/Transactions';
import MyOrders from '@/src/pages/MyOrders';

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
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/products/:id" element={<Product />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/transactions" element={<Transactions />} />
              <Route path="/my-orders" element={<MyOrders />} />
            </Routes>
          </AppLayout>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
