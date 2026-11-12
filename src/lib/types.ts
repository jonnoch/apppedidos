// Tipos compartidos del dominio PedidosPizza

export type ProductType = "pizza" | "simple" | "combo" | "drink_choice";

export type OrderStatus =
  | "nuevo"
  | "en_preparacion"
  | "listo"
  | "en_camino"
  | "entregado"
  | "cancelado";

export type PaymentMethod = "efectivo" | "transferencia";

export type StaffRole = "owner" | "kitchen" | "driver";

export interface LocationRow {
  id: string;
  name: string;
  whatsapp: string | null;
  phone: string | null;
  nequi_daviplata: string | null;
  hours_text: string;
  open_hour: number;
  close_hour: number;
  orders_paused: boolean;
  base_delivery_fee: number;
  min_order: number;
}

export interface DeliveryZone {
  id: string;
  location_id: string;
  name: string;
  km: number;
  delivery_fee: number;
  is_home_town: boolean;
  sort_order: number;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  note: string | null;
  sort_order: number;
}

export interface ProductSize {
  id: string;
  product_id: string;
  slug: string;
  name: string;
  portions: number | null;
  price: number;
  max_flavors: number;
  sort_order: number;
  sold_out: boolean;
}

export interface Flavor {
  id: string;
  location_id: string;
  category_id: string;
  name: string;
  active: boolean;
  sold_out: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  location_id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  product_type: ProductType;
  price: number | null;
  is_alcohol: boolean;
  requires_drink_choice: boolean;
  drink_options: string[];
  sold_out: boolean;
  active: boolean;
  sort_order: number;
  sizes?: ProductSize[];
}

export interface Staff {
  id: string;
  user_id: string | null;
  location_id: string;
  name: string;
  role: StaffRole;
  pin: string | null;
  active: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  size_name: string | null;
  flavors: string[];
  drink_choice: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes: string | null;
}

export interface Order {
  id: string;
  location_id: string;
  order_number: number;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  address: string;
  town: string;
  notes: string | null;
  payment_method: PaymentMethod;
  delivery_fee: number;
  subtotal: number;
  total: number;
  has_alcohol: boolean;
  age_confirmed: boolean;
  consent_accepted: boolean;
  driver_id: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  driver?: { name: string } | null;
}

// --- Carrito (lado cliente) --------------------------------------------------
export interface CartItem {
  key: string; // id único en el carrito
  productId: string;
  productSlug: string;
  name: string;
  sizeSlug?: string;
  sizeName?: string;
  flavors: string[];
  drinkChoice?: string;
  quantity: number;
  unitPrice: number;
  isAlcohol: boolean;
}
