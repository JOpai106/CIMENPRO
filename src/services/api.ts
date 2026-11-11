/**
 * Client API pour Gestion Dépôt Ciment
 */
import {
  CompanySettings,
  DashboardStats,
  Product,
  Supplier,
  Customer,
  Purchase,
  Sale,
  Delivery,
  Quotation,
  Invoice,
  Payment,
  Expense,
  InventoryAdjustment,
  StockMovement,
  User,
  AuditLog,
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur (${response.status})`);
  }
  return response.json();
}

export const api = {
  // Settings
  getSettings: () => request<CompanySettings>('/settings'),
  updateSettings: (data: Partial<CompanySettings>) =>
    request<CompanySettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard
  getDashboard: () => request<DashboardStats>('/dashboard'),

  // Users
  getUsers: () => request<User[]>('/users'),
  createUser: (data: Partial<User>) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),

  // Products
  getProducts: () => request<Product[]>('/products'),
  createProduct: (data: Partial<Product>) => request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<Product>) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getProductMovements: (id: string) => request<StockMovement[]>(`/products/${id}/movements`),
  getAllStockMovements: () => request<StockMovement[]>('/stock/movements'),

  // Suppliers & Customers
  getSuppliers: () => request<Supplier[]>('/suppliers'),
  createSupplier: (data: Partial<Supplier>) => request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  getCustomers: () => request<Customer[]>('/customers'),
  createCustomer: (data: Partial<Customer>) => request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),

  // Purchases
  getPurchases: () => request<Purchase[]>('/purchases'),
  createPurchase: (data: any) => request<any>('/purchases', { method: 'POST', body: JSON.stringify(data) }),

  // Sales
  getSales: () => request<Sale[]>('/sales'),
  createSale: (data: any) => request<any>('/sales', { method: 'POST', body: JSON.stringify(data) }),

  // Deliveries
  getDeliveries: () => request<Delivery[]>('/deliveries'),
  executeDelivery: (id: string, data: any) =>
    request<any>(`/deliveries/${id}/execute`, { method: 'POST', body: JSON.stringify(data) }),

  // Quotations
  getQuotations: () => request<Quotation[]>('/quotations'),
  createQuotation: (data: any) => request<any>('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  updateQuoteStatus: (id: string, status: string) =>
    request<any>(`/quotations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  convertToSale: (id: string, data: any) =>
    request<any>(`/quotations/${id}/convert-to-sale`, { method: 'POST', body: JSON.stringify(data) }),

  // Invoices
  getInvoices: () => request<Invoice[]>('/invoices'),
  cancelInvoice: (id: string, reason: string, user_name?: string) =>
    request<any>(`/invoices/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason, user_name }) }),

  // Payments & Cash
  getPayments: () => request<Payment[]>('/payments'),
  createPayment: (data: any) => request<any>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  getExpenses: () => request<Expense[]>('/expenses'),
  createExpense: (data: any) => request<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  getCashFlow: () => request<{ total_balance: number; by_method: any[]; transactions: any[] }>('/cash'),

  // Inventory
  getInventoryAdjustments: () => request<InventoryAdjustment[]>('/inventory/adjustments'),
  createInventoryAdjustment: (data: any) =>
    request<any>('/inventory/adjustments', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReports: (params: { startDate?: string; endDate?: string; productId?: string; brand?: string }) => {
    const q = new URLSearchParams();
    if (params.startDate) q.append('startDate', params.startDate);
    if (params.endDate) q.append('endDate', params.endDate);
    if (params.productId) q.append('productId', params.productId);
    if (params.brand) q.append('brand', params.brand);
    return request<any>(`/reports?${q.toString()}`);
  },

  // Admin Deletion APIs
  deleteProduct: (id: string) => request<{ success: boolean; message: string }>(`/products/${id}`, { method: 'DELETE' }),
  deleteUser: (id: string) => request<{ success: boolean; message: string }>(`/users/${id}`, { method: 'DELETE' }),
  deleteSupplier: (id: string) => request<{ success: boolean; message: string }>(`/suppliers/${id}`, { method: 'DELETE' }),
  deleteCustomer: (id: string) => request<{ success: boolean; message: string }>(`/customers/${id}`, { method: 'DELETE' }),
  deletePurchase: (id: string) => request<{ success: boolean; message: string }>(`/purchases/${id}`, { method: 'DELETE' }),
  deleteSale: (id: string) => request<{ success: boolean; message: string }>(`/sales/${id}`, { method: 'DELETE' }),
  deleteDelivery: (id: string) => request<{ success: boolean; message: string }>(`/deliveries/${id}`, { method: 'DELETE' }),
  deleteQuotation: (id: string) => request<{ success: boolean; message: string }>(`/quotations/${id}`, { method: 'DELETE' }),
  deleteInvoice: (id: string) => request<{ success: boolean; message: string }>(`/invoices/${id}`, { method: 'DELETE' }),
  deletePayment: (id: string) => request<{ success: boolean; message: string }>(`/payments/${id}`, { method: 'DELETE' }),
  deleteExpense: (id: string) => request<{ success: boolean; message: string }>(`/expenses/${id}`, { method: 'DELETE' }),
  deleteInventoryAdjustment: (id: string) => request<{ success: boolean; message: string }>(`/inventory/adjustments/${id}`, { method: 'DELETE' }),
  deleteStockMovement: (id: string) => request<{ success: boolean; message: string }>(`/stock/movements/${id}`, { method: 'DELETE' }),

  // Audit & Demo Data
  getAuditLogs: () => request<AuditLog[]>('/audit-logs'),
  resetDemoData: () => request<{ success: boolean; message: string }>('/admin/reset-demo', { method: 'POST' }),
  purgeData: () => request<{ success: boolean; message: string }>('/admin/purge-data', { method: 'POST' }),
};
