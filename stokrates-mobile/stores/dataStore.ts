import { create } from 'zustand';
import * as db from '@/services/db';
import type {
  Product, Customer, Sale, Expense, User, Todo,
  DebtCredit, MessageTemplate, MessageLog, SystemLog,
  TrendyolAnalysisRecord, Platform, Asset, AssetTransaction,
  TrendyolConfig, ShippingSettings, AnnouncementSettings,
} from '@/types';

interface DataState {
  // Collections
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  users: User[];
  todos: Todo[];
  debtCredits: DebtCredit[];
  templates: MessageTemplate[];
  messageLogs: MessageLog[];
  systemLogs: SystemLog[];
  trendyolAnalyses: TrendyolAnalysisRecord[];
  platforms: Platform[];
  assets: Asset[];
  assetTransactions: AssetTransaction[];

  // Settings
  trendyolConfig: TrendyolConfig | null;
  shippingSettings: ShippingSettings;
  announcementSettings: AnnouncementSettings;

  // Actions
  initialize: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // Product actions
  refreshProducts: () => Promise<void>;
  saveProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Customer actions
  refreshCustomers: () => Promise<void>;
  saveCustomer: (c: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  // Sale actions
  refreshSales: () => Promise<void>;
  saveSale: (s: Sale) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  cancelSale: (id: string) => Promise<void>;
  processSaleReturn: (saleId: string, returns: { productId: string; returnQty: number }[]) => Promise<void>;

  // Expense actions
  refreshExpenses: () => Promise<void>;
  saveExpense: (e: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Todo actions
  refreshTodos: () => Promise<void>;
  saveTodo: (t: Todo) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;

  // DebtCredit actions
  refreshDebtCredits: () => Promise<void>;
  saveDebtCredit: (d: DebtCredit) => Promise<void>;
  deleteDebtCredit: (id: string) => Promise<void>;

  // User actions
  refreshUsers: () => Promise<void>;
  saveUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // Asset actions
  refreshAssets: () => Promise<void>;
  saveAsset: (a: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  saveAssetTransaction: (tx: AssetTransaction) => Promise<void>;
  getInvestmentCash: () => number;
}

const DEFAULT_SHIPPING: ShippingSettings = { prices: {}, defaultPrice: 35, companies: [] };
const DEFAULT_ANNOUNCEMENT: AnnouncementSettings = {
  isEnabled: true,
  showTodoReminder: true, todoReminderFrequency: 'every_login',
  showStockReminder: true, stockThreshold: 5, stockReminderFrequency: 'every_login',
  showTaxReminder: true, taxReminderFrequency: 'every_login',
  showDebtReminder: true, debtReminderFrequency: 'every_login',
  customAnnouncements: [],
};

export const useDataStore = create<DataState>((set, get) => ({
  // Initial empty state
  products: [],
  customers: [],
  sales: [],
  expenses: [],
  users: [],
  todos: [],
  debtCredits: [],
  templates: [],
  messageLogs: [],
  systemLogs: [],
  trendyolAnalyses: [],
  platforms: [],
  assets: [],
  assetTransactions: [],
  trendyolConfig: null,
  shippingSettings: DEFAULT_SHIPPING,
  announcementSettings: DEFAULT_ANNOUNCEMENT,

  initialize: async () => {
    await db.initializeAppData();
    await get().refreshAll();
  },

  refreshAll: async () => {
    set({
      products: await db.getProducts(),
      customers: await db.getCustomers(),
      sales: await db.getSales(),
      expenses: await db.getExpenses(),
      users: await db.getUsers(),
      todos: await db.getTodos(),
      debtCredits: await db.getDebtCredits(),
      templates: await db.getTemplates(),
      messageLogs: await db.getMessageLogs(),
      systemLogs: await db.getSystemLogs(),
      trendyolAnalyses: await db.getTrendyolAnalyses(),
      platforms: await db.getPlatforms(),
      assets: await db.getAssets(),
      assetTransactions: await db.getAssetTransactions(),
      trendyolConfig: await db.getTrendyolConfig(),
      shippingSettings: (await db.getShippingSettings()) ?? DEFAULT_SHIPPING,
      announcementSettings: (await db.getAnnouncementSettings()) ?? DEFAULT_ANNOUNCEMENT,
    });
  },

  // Products
  refreshProducts: async () => set({ products: await db.getProducts() }),
  saveProduct: async (p) => { await db.saveProduct(p); set({ products: await db.getProducts() }); },
  deleteProduct: async (id) => { await db.deleteProduct(id); set({ products: await db.getProducts() }); },

  // Customers
  refreshCustomers: async () => set({ customers: await db.getCustomers() }),
  saveCustomer: async (c) => { await db.saveCustomer(c); set({ customers: await db.getCustomers() }); },
  deleteCustomer: async (id) => { await db.deleteCustomer(id); set({ customers: await db.getCustomers() }); },

  // Sales (also refreshes products because stock changes)
  refreshSales: async () => set({ sales: await db.getSales() }),
  saveSale: async (s) => {
    await db.saveSale(s);
    set({ sales: await db.getSales(), products: await db.getProducts() });
  },
  deleteSale: async (id) => {
    await db.deleteSale(id);
    set({ sales: await db.getSales(), products: await db.getProducts() });
  },
  cancelSale: async (id) => {
    await db.cancelSale(id);
    set({ sales: await db.getSales(), products: await db.getProducts() });
  },
  processSaleReturn: async (saleId, returns) => {
    await db.processSaleReturn(saleId, returns);
    set({ sales: await db.getSales(), products: await db.getProducts() });
  },

  // Expenses
  refreshExpenses: async () => set({ expenses: await db.getExpenses() }),
  saveExpense: async (e) => { await db.saveExpense(e); set({ expenses: await db.getExpenses() }); },
  deleteExpense: async (id) => { await db.deleteExpense(id); set({ expenses: await db.getExpenses() }); },

  // Todos
  refreshTodos: async () => set({ todos: await db.getTodos() }),
  saveTodo: async (t) => { await db.saveTodo(t); set({ todos: await db.getTodos() }); },
  deleteTodo: async (id) => { await db.deleteTodo(id); set({ todos: await db.getTodos() }); },

  // DebtCredits
  refreshDebtCredits: async () => set({ debtCredits: await db.getDebtCredits() }),
  saveDebtCredit: async (d) => { await db.saveDebtCredit(d); set({ debtCredits: await db.getDebtCredits() }); },
  deleteDebtCredit: async (id) => { await db.deleteDebtCredit(id); set({ debtCredits: await db.getDebtCredits() }); },

  // Users
  refreshUsers: async () => set({ users: await db.getUsers() }),
  saveUser: async (u) => { await db.saveUser(u); set({ users: await db.getUsers() }); },
  deleteUser: async (id) => { await db.deleteUser(id); set({ users: await db.getUsers() }); },

  // Assets
  refreshAssets: async () => set({
    assets: await db.getAssets(),
    assetTransactions: await db.getAssetTransactions(),
  }),
  saveAsset: async (a) => { await db.saveAsset(a); set({ assets: await db.getAssets() }); },
  deleteAsset: async (id) => { await db.deleteAsset(id); set({ assets: await db.getAssets() }); },
  saveAssetTransaction: async (tx) => {
    await db.saveAssetTransaction(tx);
    set({ assetTransactions: await db.getAssetTransactions() });
  },
  getInvestmentCash: () => {
    return get().assetTransactions.reduce((acc, tx) => {
      if (tx.type === 'deposit' || tx.type === 'sell') return acc + tx.total;
      if (tx.type === 'withdraw' || tx.type === 'buy') return acc - tx.total;
      return acc;
    }, 0);
  },
}));
