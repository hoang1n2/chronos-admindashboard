/**
 * Shared types for Admin Dashboard
 */

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
}

export interface Order {
  id: string;
  order_id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: Array<{
    name: string;
    price: number;
    image?: string;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  discount_amount: number;
  is_active: boolean;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_sign_in_at?: string;
}

export interface SupplierProduct {
  id: string;
  supplier: string;
  name: string;
  price: number;
  previous_price?: number;
  currency: string;
  in_stock: boolean;
  url: string;
  last_checked: string;
  price_changed: boolean;
  stock_changed: boolean;
  is_new: boolean;
}

export interface SupplierCheck {
  id: string;
  supplier: string;
  checked_at: string;
  products_count: number;
  changes_detected: number;
  status: 'success' | 'error';
  error_message?: string;
}

export interface DashboardNotification {
  id: string;
  type: 'price_change' | 'out_of_stock' | 'back_in_stock' | 'new_product' | 'new_order' | 'info';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  data?: Record<string, unknown>;
}
