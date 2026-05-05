// =============================================================
// STOKrates Mobile — Type Definitions
// Mirrored 1:1 from web app's types.ts
// =============================================================

export interface User {
  id: string;
  username: string;
  email?: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface ProductImage {
  id: string;
  data: string;
  fileName: string;
  type: string;
}

export interface ProductHistoryEntry {
  id: string;
  date: string;
  user: string;
  type: 'create' | 'update';
  changes: {
    field: string;
    oldValue: string | number | undefined;
    newValue: string | number | undefined;
  }[];
}

export interface Product {
  id: string;
  code?: string;
  barcode?: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  price: number;
  marketPrice?: number;
  minSalePrice?: number;
  cost: number;
  vatRate?: number;
  stock: number;
  soldCount?: number;
  desi?: number;
  images?: ProductImage[];
  history?: ProductHistoryEntry[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  discountCode?: string;
  hasReview?: boolean;
  gender?: 'male' | 'female';
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  returnedQuantity?: number;
  unitPrice: number;
  totalPrice: number;
  vatRate: number;
  vatAmount: number;
  analysisCommission?: number;
}

export interface Sale {
  id: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  totalVat: number;
  date: string;
  status?: 'completed' | 'cancelled';
  commissionRate?: number;
  serviceFee?: number;
  platformId?: string;
  shippingCompanyId?: string;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  date: string;
  endDate?: string;
  description?: string;
  isAd?: boolean;
  isTax?: boolean;
  isPaid?: boolean;
  platform?: string;
  impressions?: number;
  clicks?: number;
  adRevenue?: number;
}

export interface DebtCredit {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  type: 'debt' | 'credit';
  isCompleted: boolean;
  description?: string;
}

export interface Todo {
  id: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  isCompleted: boolean;
  createdAt: string;
  startDate?: string;
  endDate?: string;
}

export type AnnouncementFrequency = 'every_login' | 'once_a_day' | 'once_a_week' | 'once_a_month';

export interface CustomAnnouncement {
  id: string;
  text: string;
  isActive: boolean;
  frequency: AnnouncementFrequency;
}

export interface AnnouncementSettings {
  isEnabled: boolean;
  showTodoReminder: boolean;
  todoReminderFrequency: AnnouncementFrequency;
  showStockReminder: boolean;
  stockThreshold: number;
  stockReminderFrequency: AnnouncementFrequency;
  showTaxReminder: boolean;
  taxReminderFrequency: AnnouncementFrequency;
  showDebtReminder: boolean;
  debtReminderFrequency: AnnouncementFrequency;
  customAnnouncements: CustomAnnouncement[];
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

export interface MessageLog {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  templateTitle: string;
  content: string;
  sentAt: string;
  orderNumber?: string;
}

export interface TrendyolConfig {
  isActive: boolean;
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  integrationCode?: string;
  token?: string;
  isTestMode: boolean;
  useProxy: boolean;
}

export interface ShippingCompany {
  id: string;
  name: string;
  prices: Record<number, number>;
}

export interface ShippingSettings {
  prices: Record<number, number>;
  defaultPrice: number;
  companies: ShippingCompany[];
}

export interface Platform {
  id: string;
  name: string;
  defaultCommissionRate: number;
  defaultServiceFee: number;
}

export interface SystemLog {
  id: string;
  date: string;
  source: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  stackTrace?: string;
}

export interface TrendyolAnalysisRecord {
  id: string;
  startDate: string;
  endDate: string;
  analysisDate: string;
  type: 'commission_tariff' | 'advantage_tag';
  products: {
    barcode: string;
    baseCommission?: number;
    tiers?: { minPrice: number; maxPrice: number; commissionRate: number }[];
    stars?: { level: number; minPrice: number; maxPrice: number; targetPrice: number; commissionUsed: number }[];
  }[];
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'commodity' | 'currency' | 'cash';
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  updatedAt: string;
}

export interface AssetTransaction {
  id: string;
  assetId: string;
  symbol: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdraw';
  quantity: number;
  price: number;
  total: number;
  date: string;
  realizedProfit?: number;
}
