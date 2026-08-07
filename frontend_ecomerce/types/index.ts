// Domain Types - Following SOLID principles

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  stock: number;
  stripePriceId?: string; // For future Stripe integration
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  id: string;
  customer: Customer;
  items: CartItem[];
  total: number;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  createdAt: Date;
  stripePaymentIntentId?: string; // For Stripe integration
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Repository interfaces following Dependency Inversion Principle
export interface IProductRepository {
  getAll(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  getByCategory(category: string): Promise<Product[]>;
}

export interface IOrderRepository {
  create(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order>;
  getById(id: string): Promise<Order | null>;
}

// Payment gateway interface for future Stripe integration
export interface IPaymentGateway {
  createPaymentIntent(amount: number, currency: string): Promise<string>;
  confirmPayment(paymentIntentId: string): Promise<boolean>;
}
