/**
 * Définitions de types pour Gestion Dépôt Ciment
 */

export type UserRole = 
  | 'admin' 
  | 'gestionnaire_stock' 
  | 'commercial' 
  | 'caissier' 
  | 'responsable';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  brand: string; // Cimaf, Dangote, Ciments du Bassin du Congo, Socimat, etc.
  type_ref: string; // CPJ 35, CPJ 42.5, CPA 55, etc.
  packaging: string; // 50kg
  unit: string; // sac
  purchase_price: number; // FCFA
  selling_price: number; // FCFA
  initial_stock: number;
  current_stock: number;
  reserved_stock: number; // sacs vendus en attente de livraison
  min_stock: number;
  supplier_id?: string;
  supplier_name?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  contact_person?: string;
  email?: string;
  notes?: string;
  total_purchases?: number;
  created_at: string;
}

export type CustomerType = 'grossiste' | 'demi_grossiste' | 'détaillant' | 'entrepreneur_btp' | 'particulier';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  customer_type: CustomerType;
  credit_limit: number;
  total_invoiced?: number;
  total_paid?: number;
  balance_due?: number;
  created_at: string;
}

export interface PurchaseItem {
  id?: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  quantity: number; // sacs
  unit_price: number;
  total_price: number;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  date: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_invoice_ref: string;
  total_amount: number;
  status: 'validee' | 'en_attente' | 'annulee';
  created_by: string;
  notes?: string;
  items: PurchaseItem[];
  created_at: string;
}

export type MovementType = 
  | 'ENTREE_ACHAT' 
  | 'SORTIE_VENTE_DIRECTE' 
  | 'SORTIE_LIVRAISON' 
  | 'AJUSTEMENT_INVENTAIRE_PLUS' 
  | 'AJUSTEMENT_INVENTAIRE_MOINS' 
  | 'RETOUR_ANNULATION';

export interface StockMovement {
  id: string;
  date: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  movement_type: MovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_price: number;
  reference_type: 'purchase' | 'sale' | 'delivery' | 'inventory';
  reference_id: string;
  reference_number?: string;
  created_by: string;
  reason?: string;
  created_at: string;
}

export type DeliveryType = 'emporte_immediat' | 'a_livrer';
export type PaymentStatus = 'payee' | 'partielle' | 'impayee';
export type PaymentMethod = 'especes' | 'mobile_money' | 'virement' | 'autre';
export type DeliveryStatus = 'livree' | 'en_attente' | 'partielle' | 'annulee';

export interface SaleItem {
  id?: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
  delivered_quantity: number;
}

export interface Sale {
  id: string;
  sale_number: string;
  date: string;
  customer_id: string;
  customer_name?: string;
  delivery_type: DeliveryType;
  subtotal: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  delivery_status: DeliveryStatus;
  created_by: string;
  notes?: string;
  items: SaleItem[];
  created_at: string;
}

export interface DeliveryItem {
  id?: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  quantity_ordered: number;
  quantity_delivered: number;
  quantity_remaining: number;
}

export interface Delivery {
  id: string;
  delivery_number: string;
  date: string;
  sale_id: string;
  sale_number?: string;
  customer_id: string;
  customer_name?: string;
  delivery_address: string;
  driver_name: string;
  vehicle_info: string;
  status: DeliveryStatus;
  notes?: string;
  created_by: string;
  items: DeliveryItem[];
  created_at: string;
}

export type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';

export interface QuotationItem {
  id?: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export interface Quotation {
  id: string;
  quote_number: string;
  date: string;
  expiry_date: string;
  customer_id: string;
  customer_name?: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  status: QuoteStatus;
  converted_to_sale_id?: string;
  converted_to_invoice_id?: string;
  created_by: string;
  notes?: string;
  items: QuotationItem[];
  created_at: string;
}

export interface InvoiceItem {
  id?: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  sale_id: string;
  sale_number?: string;
  customer_id: string;
  customer_name?: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  status: 'validee' | 'annulee';
  cancellation_reason?: string;
  created_by: string;
  notes?: string;
  items: InvoiceItem[];
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  date: string;
  customer_id: string;
  customer_name?: string;
  sale_id?: string;
  sale_number?: string;
  invoice_id?: string;
  invoice_number?: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export type ExpenseCategory = 
  | 'carburant' 
  | 'manutention_dechargement' 
  | 'salaires' 
  | 'loyer' 
  | 'entretien_vehicule' 
  | 'electricite_eau' 
  | 'divers';

export interface Expense {
  id: string;
  expense_number: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  receipt_ref?: string;
  approved_by?: string;
  created_by: string;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  date: string;
  type: 'ENCAISSEMENT_VENTE' | 'PAIEMENT_FACTURE' | 'DEPENSE' | 'AJUSTEMENT_CAISSE';
  amount: number;
  payment_method: PaymentMethod;
  reference_id?: string;
  reference_number?: string;
  reference_type?: string;
  created_by: string;
  notes?: string;
  created_at: string;
}

export interface InventoryAdjustment {
  id: string;
  adjustment_number: string;
  date: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  theoretical_stock: number;
  physical_stock: number;
  discrepancy: number;
  reason: string;
  validated_by: string;
  created_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  date: string;
  user_id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string;
  details?: string;
  created_at: string;
}

export interface CompanySettings {
  id: number;
  company_name: string;
  tagline: string;
  logo_url: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  nif?: string;
  currency: string;
  prefix_quote: string;
  prefix_invoice: string;
  prefix_receipt: string;
  prefix_delivery: string;
  prefix_purchase: string;
  low_stock_threshold: number;
  timezone: string;
  footer_note: string;
  bank_details?: string;
  mobile_money_details?: string;
}

export interface DashboardStats {
  product_count: number;
  total_stock_bags: number;
  stock_financial_value: number;
  total_received_bags: number;
  total_delivered_bags: number;
  total_sold_bags: number;
  ca_today: number;
  ca_week: number;
  ca_month: number;
  collected_receipts: number;
  total_expenses: number;
  customer_debts: number;
  estimated_gross_profit: number;
  quotations_count: number;
  invoices_count: number;
  cash_balance: number;
  alerts: {
    low_stock_products: Product[];
    unpaid_invoices: Invoice[];
    debtor_customers: Customer[];
    pending_quotes: Quotation[];
  };
  charts: {
    sales_by_day: { date: string; amount: number; bags: number }[];
    receipts_by_week: { label: string; amount: number }[];
    ca_by_month: { month: string; amount: number }[];
    sales_by_brand: { brand: string; bags: number; amount: number }[];
    stock_by_product: { name: string; stock: number; min_stock: number }[];
  };
}
