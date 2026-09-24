export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  images: string[];
  category: string;
  stock: number;
  active?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  recipient: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'BR';
}

export interface CheckoutRequest {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: ShippingAddress;
}

export interface CheckoutResponse {
  clientSecret: string;
  orderId: string;
  amount: number;
  currency: string;
}

export interface OrderProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  qty: number;
  image?: string;
}

export interface Order {
  id: string;
  stripePaymentIntentId: string | null;
  amount: number;
  currency: string;
  status: string;
  orderStatus: string;
  paymentMethod?: string | null;
  userEmail?: string;
  userName?: string;
  products: OrderProduct[];
  shippingAddress: ShippingAddress;
  trackingCode?: string | null;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string | null;
  adminNotesUpdatedAt?: string | null;
  adminNotesUpdatedBy?: string | null;
}
