import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { markCollectionDirty, markSettingDirty } from './sync';
import { COLLECTIONS, SETTING_KEYS } from '@/constants/collections';
import type {
  Product, Customer, Sale, Expense, User, Todo,
  DebtCredit, MessageTemplate, MessageLog, SystemLog,
  TrendyolAnalysisRecord, Platform, Asset, AssetTransaction,
  ProductHistoryEntry, TrendyolConfig, ShippingSettings, AnnouncementSettings,
} from '@/types';

// ============================================================
// IN-MEMORY STORE
//
// Primary data source. Loaded from Supabase on init (with
// timestamp-based conflict resolution), falls back to AsyncStorage.
// Every write updates:
//   1. _store (instant, synchronous)
//   2. AsyncStorage (awaited, offline backup)
//   3. Supabase (debounced dirty-flag sync via sync.ts)
// ============================================================

const _store: Record<string, any[]> = {};
const _settings: Record<string, any> = {};

// Per-collection local timestamps — tracks when each collection
// was last modified locally. Used for conflict resolution on init.
const LOCAL_TS_KEY = '__local_timestamps';

async function getLocalTimestamps(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(LOCAL_TS_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function setLocalTimestamp(key: string): Promise<void> {
  const ts = await getLocalTimestamps();
  ts[key] = new Date().toISOString();
  await AsyncStorage.setItem(LOCAL_TS_KEY, JSON.stringify(ts));
}

// ============================================================
// COLLECTION CRUD (internal)
// ============================================================

async function getCollection<T>(key: string): Promise<T[]> {
  if (key in _store) return _store[key] as T[];
  const raw = await AsyncStorage.getItem(key);
  _store[key] = raw ? JSON.parse(raw) : [];
  return _store[key] as T[];
}

async function saveCollection<T>(key: string, data: T[]): Promise<void> {
  _store[key] = data;
  await AsyncStorage.setItem(key, JSON.stringify(data));
  await setLocalTimestamp(key);
  markCollectionDirty(key); // fire-and-forget, debounced
}

/**
 * Atomically save multiple collections at once.
 * All AsyncStorage writes happen in a batch, and all dirty flags
 * are set together. Prevents orphaned state if app crashes mid-write.
 */
async function saveCollectionsBatch(entries: [string, any[]][]): Promise<void> {
  // 1. Update in-memory store (synchronous, instant)
  for (const [key, data] of entries) {
    _store[key] = data;
  }

  // 2. Batch write to AsyncStorage
  const ts = await getLocalTimestamps();
  const now = new Date().toISOString();
  const pairs: [string, string][] = entries.map(([key, data]) => {
    ts[key] = now;
    return [key, JSON.stringify(data)];
  });
  pairs.push([LOCAL_TS_KEY, JSON.stringify(ts)]);
  await AsyncStorage.multiSet(pairs);

  // 3. Mark all as dirty for sync
  for (const [key] of entries) {
    markCollectionDirty(key); // each debounced independently
  }
}

// ============================================================
// SETTINGS CRUD (internal)
// ============================================================

async function getSetting<T>(key: string): Promise<T | null> {
  if (key in _settings) return _settings[key] as T;
  const raw = await AsyncStorage.getItem(key);
  if (raw) {
    _settings[key] = JSON.parse(raw);
    return _settings[key];
  }
  return null;
}

async function saveSetting<T>(key: string, value: T): Promise<void> {
  _settings[key] = value;
  await AsyncStorage.setItem(key, JSON.stringify(value));
  await setLocalTimestamp(key);
  markSettingDirty(key); // fire-and-forget, debounced
}

// ============================================================
// INITIALIZATION — Timestamp-based conflict resolution
//
// For each collection/setting:
//   1. Fetch remote data + its updated_at from Supabase
//   2. Compare with local updated_at timestamp
//   3. If remote is newer -> overwrite local
//      If local is newer -> keep local (it will sync up later)
//      If no remote data -> use local (offline bootstrap)
// ============================================================

export const initializeAppData = async (): Promise<void> => {
  const localTimestamps = await getLocalTimestamps();

  try {
    // --- Collections ---
    for (const col of COLLECTIONS) {
      const { data, error } = await supabase
        .from('app_data')
        .select('data, updated_at')
        .eq('collection', col);

      if (!error && data && data.length > 0) {
        // Find the most recent updated_at from remote rows
        const remoteMaxTs = data.reduce((max, r) => {
          const t = r.updated_at ?? '';
          return t > max ? t : max;
        }, '');

        const localTs = localTimestamps[col] ?? '';

        if (remoteMaxTs >= localTs) {
          // Remote is newer (or equal) — use remote data
          const items = data.map((r: any) => r.data);
          _store[col] = items;
          await AsyncStorage.setItem(col, JSON.stringify(items));
        } else {
          // Local is newer — keep local, it will sync to Supabase
          const raw = await AsyncStorage.getItem(col);
          if (raw) {
            _store[col] = JSON.parse(raw);
          }
          // Mark dirty so our newer local data syncs up
          markCollectionDirty(col);
        }
      } else {
        // No remote data or error — fallback to AsyncStorage
        const raw = await AsyncStorage.getItem(col);
        if (raw) _store[col] = JSON.parse(raw);
      }
    }

    // --- Settings ---
    for (const key of SETTING_KEYS) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value, updated_at')
        .eq('key', key)
        .maybeSingle();

      if (!error && data) {
        const remoteTs = data.updated_at ?? '';
        const localTs = localTimestamps[key] ?? '';

        if (remoteTs >= localTs) {
          _settings[key] = data.value;
          await AsyncStorage.setItem(key, JSON.stringify(data.value));
        } else {
          const raw = await AsyncStorage.getItem(key);
          if (raw) _settings[key] = JSON.parse(raw);
          markSettingDirty(key);
        }
      } else {
        const raw = await AsyncStorage.getItem(key);
        if (raw) _settings[key] = JSON.parse(raw);
      }
    }
  } catch (err) {
    console.warn('[DB] Supabase init failed, using local data:', err);
    // Full offline fallback
    for (const col of COLLECTIONS) {
      const raw = await AsyncStorage.getItem(col);
      if (raw) _store[col] = JSON.parse(raw);
    }
    for (const key of SETTING_KEYS) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) _settings[key] = JSON.parse(raw);
    }
  }
};

// ============================================================
// HELPERS
// ============================================================

export const generateId = (): string =>
  Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

// ============================================================
// PRODUCTS
// ============================================================

export const getProducts = async (): Promise<Product[]> =>
  getCollection<Product>('products');

export const saveProduct = async (product: Product): Promise<void> => {
  const products = await getProducts();
  const currentUser = await getCurrentUser();
  const username = currentUser?.username ?? 'Sistem';
  const index = products.findIndex(p => p.id === product.id);

  if (index >= 0) {
    const existing = products[index];
    const fieldsToTrack: (keyof Product)[] = ['name', 'stock', 'price', 'cost', 'marketPrice', 'code', 'category', 'desi'];
    const changes = fieldsToTrack
      .filter(f => existing[f] !== product[f])
      .map(f => ({ field: f as string, oldValue: existing[f] as any, newValue: product[f] as any }));

    if (changes.length > 0) {
      const entry: ProductHistoryEntry = {
        id: generateId(), date: new Date().toISOString(), user: username, type: 'update', changes,
      };
      product.history = [entry, ...(existing.history || [])];
    } else {
      product.history = existing.history;
    }
    products[index] = product;
  } else {
    const entry: ProductHistoryEntry = {
      id: generateId(), date: new Date().toISOString(), user: username, type: 'create',
      changes: [{ field: 'Genel', oldValue: '-', newValue: 'Urun olusturuldu' }],
    };
    product.history = [entry];
    products.push(product);
  }
  await saveCollection('products', products);
};

export const deleteProduct = async (id: string): Promise<void> =>
  saveCollection('products', (await getProducts()).filter(p => p.id !== id));

// ============================================================
// CUSTOMERS
// ============================================================

export const getCustomers = async (): Promise<Customer[]> =>
  getCollection<Customer>('customers');

export const saveCustomer = async (customer: Customer): Promise<void> => {
  const customers = await getCustomers();
  const index = customers.findIndex(c => c.id === customer.id);
  if (index >= 0) customers[index] = customer;
  else customers.push(customer);
  await saveCollection('customers', customers);
};

export const deleteCustomer = async (id: string): Promise<void> =>
  saveCollection('customers', (await getCustomers()).filter(c => c.id !== id));

// ============================================================
// SALES — All stock-affecting operations use saveCollectionsBatch
// to write products + sales atomically.
// ============================================================

export const getSales = async (): Promise<Sale[]> =>
  getCollection<Sale>('sales');

export const saveSale = async (sale: Sale): Promise<void> => {
  if (!sale.status) sale.status = 'completed';
  const sales = await getSales();
  const products = await getProducts();
  const index = sales.findIndex(s => s.id === sale.id);

  if (index >= 0) {
    const oldSale = sales[index];
    // Reverse old stock impact
    if (oldSale.status !== 'cancelled') {
      oldSale.items.forEach(item => {
        const pi = products.findIndex(p => p.id === item.productId);
        if (pi >= 0) products[pi].stock += item.quantity - (item.returnedQuantity || 0);
      });
    }
    // Apply new stock impact
    if (sale.status !== 'cancelled') {
      sale.items.forEach(item => {
        const pi = products.findIndex(p => p.id === item.productId);
        if (pi >= 0) products[pi].stock -= item.quantity - (item.returnedQuantity || 0);
      });
    }
    sales[index] = sale;
  } else {
    sale.items.forEach(item => {
      const pi = products.findIndex(p => p.id === item.productId);
      if (pi >= 0) products[pi].stock -= item.quantity - (item.returnedQuantity || 0);
    });
    sales.push(sale);
  }

  // ATOMIC: write both collections in a single batch
  await saveCollectionsBatch([
    ['products', products],
    ['sales', sales],
  ]);
};

export const cancelSale = async (saleId: string): Promise<void> => {
  const sales = await getSales();
  const saleIndex = sales.findIndex(s => s.id === saleId);
  if (saleIndex === -1) return;
  const sale = sales[saleIndex];
  if (sale.status === 'cancelled') return;

  const products = await getProducts();
  sale.items.forEach(item => {
    const pi = products.findIndex(p => p.id === item.productId);
    if (pi >= 0) products[pi].stock += item.quantity - (item.returnedQuantity || 0);
  });
  sales[saleIndex].status = 'cancelled';

  await saveCollectionsBatch([
    ['products', products],
    ['sales', sales],
  ]);
};

export const deleteSale = async (saleId: string): Promise<void> => {
  const sales = await getSales();
  const sale = sales.find(s => s.id === saleId);
  if (!sale) return;

  const products = await getProducts();
  if (sale.status !== 'cancelled') {
    sale.items.forEach(item => {
      const pi = products.findIndex(p => p.id === item.productId);
      if (pi >= 0) products[pi].stock += item.quantity - (item.returnedQuantity || 0);
    });
  }

  await saveCollectionsBatch([
    ['products', products],
    ['sales', sales.filter(s => s.id !== saleId)],
  ]);
};

export const processSaleReturn = async (
  saleId: string,
  returns: { productId: string; returnQty: number }[]
): Promise<void> => {
  const sales = await getSales();
  const products = await getProducts();
  const saleIndex = sales.findIndex(s => s.id === saleId);
  if (saleIndex === -1) return;

  const sale = sales[saleIndex];
  returns.forEach(ret => {
    const itemIndex = sale.items.findIndex(i => i.productId === ret.productId);
    if (itemIndex >= 0) {
      const item = sale.items[itemIndex];
      const diff = ret.returnQty - (item.returnedQuantity || 0);
      item.returnedQuantity = ret.returnQty;
      const pi = products.findIndex(p => p.id === ret.productId);
      if (pi >= 0) products[pi].stock += diff;
    }
  });

  await saveCollectionsBatch([
    ['products', products],
    ['sales', sales],
  ]);
};

// ============================================================
// EXPENSES
// ============================================================

export const getExpenses = async (): Promise<Expense[]> =>
  getCollection<Expense>('expenses');

export const saveExpense = async (expense: Expense): Promise<void> => {
  const expenses = await getExpenses();
  const index = expenses.findIndex(e => e.id === expense.id);
  if (index >= 0) expenses[index] = expense;
  else expenses.push(expense);
  await saveCollection('expenses', expenses);
};

export const deleteExpense = async (id: string): Promise<void> =>
  saveCollection('expenses', (await getExpenses()).filter(e => e.id !== id));

// ============================================================
// USERS
// ============================================================

export const getUsers = async (): Promise<User[]> => {
  const users = await getCollection<User>('users');
  if (users.length === 0) {
    const admin: User = {
      id: 'admin', username: 'admin', email: 'admin@stokrates.com',
      password: '123', role: 'admin', createdAt: new Date().toISOString(),
    };
    users.push(admin);
    await saveCollection('users', users);
  }
  return users;
};

export const saveUser = async (user: User): Promise<void> => {
  const users = await getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) users[index] = user;
  else users.push(user);
  await saveCollection('users', users);
};

export const deleteUser = async (id: string): Promise<void> =>
  saveCollection('users', (await getUsers()).filter(u => u.id !== id));

export const getCurrentUser = async (): Promise<User | null> => {
  const session = await AsyncStorage.getItem('user_session');
  return session ? JSON.parse(session) : null;
};

export const loginUser = async (user: User): Promise<void> => {
  await AsyncStorage.setItem('user_session', JSON.stringify(user));
};

export const logoutUser = async (): Promise<void> => {
  await AsyncStorage.removeItem('user_session');
};

// ============================================================
// TODOS
// ============================================================

export const getTodos = async (): Promise<Todo[]> =>
  getCollection<Todo>('todos');

export const saveTodo = async (todo: Todo): Promise<void> => {
  const todos = await getTodos();
  const index = todos.findIndex(t => t.id === todo.id);
  if (index >= 0) todos[index] = todo;
  else todos.push(todo);
  await saveCollection('todos', todos);
};

export const deleteTodo = async (id: string): Promise<void> =>
  saveCollection('todos', (await getTodos()).filter(t => t.id !== id));

// ============================================================
// DEBT / CREDIT
// ============================================================

export const getDebtCredits = async (): Promise<DebtCredit[]> =>
  getCollection<DebtCredit>('debt_credits');

export const saveDebtCredit = async (data: DebtCredit): Promise<void> => {
  const items = await getDebtCredits();
  const index = items.findIndex(i => i.id === data.id);
  if (index >= 0) items[index] = data;
  else items.push(data);
  await saveCollection('debt_credits', items);
};

export const deleteDebtCredit = async (id: string): Promise<void> =>
  saveCollection('debt_credits', (await getDebtCredits()).filter(i => i.id !== id));

// ============================================================
// MESSAGE TEMPLATES
// ============================================================

export const getTemplates = async (): Promise<MessageTemplate[]> =>
  getCollection<MessageTemplate>('msg_templates');

export const saveTemplate = async (template: MessageTemplate): Promise<void> => {
  const templates = await getTemplates();
  const index = templates.findIndex(t => t.id === template.id);
  if (index >= 0) templates[index] = template;
  else templates.push(template);
  await saveCollection('msg_templates', templates);
};

export const deleteTemplate = async (id: string): Promise<void> =>
  saveCollection('msg_templates', (await getTemplates()).filter(t => t.id !== id));

// ============================================================
// MESSAGE LOGS
// ============================================================

export const getMessageLogs = async (): Promise<MessageLog[]> =>
  getCollection<MessageLog>('messages_log');

export const saveMessageLog = async (log: MessageLog): Promise<void> => {
  const logs = await getMessageLogs();
  logs.unshift(log);
  await saveCollection('messages_log', logs);
};

export const deleteMessageLog = async (id: string): Promise<void> =>
  saveCollection('messages_log', (await getMessageLogs()).filter(l => l.id !== id));

// ============================================================
// SYSTEM LOGS
// ============================================================

export const getSystemLogs = async (): Promise<SystemLog[]> =>
  getCollection<SystemLog>('system_logs');

export const saveSystemLog = async (log: SystemLog): Promise<void> => {
  const logs = await getSystemLogs();
  logs.unshift(log);
  if (logs.length > 100) logs.pop();
  await saveCollection('system_logs', logs);
};

export const clearSystemLogs = async (): Promise<void> => {
  _store['system_logs'] = [];
  await AsyncStorage.removeItem('system_logs');
  await setLocalTimestamp('system_logs');
  markCollectionDirty('system_logs');
};

// ============================================================
// TRENDYOL CONFIG
// ============================================================

export const getTrendyolConfig = async (): Promise<TrendyolConfig | null> =>
  getSetting<TrendyolConfig>('trendyol_config');

export const saveTrendyolConfig = async (config: TrendyolConfig): Promise<void> =>
  saveSetting('trendyol_config', config);

// ============================================================
// TRENDYOL ANALYSES
// ============================================================

export const getTrendyolAnalyses = async (): Promise<TrendyolAnalysisRecord[]> =>
  getCollection<TrendyolAnalysisRecord>('trendyol_analyses');

export const saveTrendyolAnalysis = async (record: TrendyolAnalysisRecord): Promise<void> => {
  const records = await getTrendyolAnalyses();
  records.unshift(record);
  if (records.length > 50) records.pop();
  await saveCollection('trendyol_analyses', records);
};

export const getTrendyolAnalysisForDate = async (date: string): Promise<TrendyolAnalysisRecord | null> => {
  const targetDate = date.split('T')[0];
  const analyses = await getTrendyolAnalyses();
  return analyses.find(r => targetDate >= r.startDate && targetDate <= r.endDate) || null;
};

export const deleteTrendyolAnalysis = async (id: string): Promise<void> =>
  saveCollection('trendyol_analyses', (await getTrendyolAnalyses()).filter(r => r.id !== id));

// ============================================================
// PLATFORMS
// ============================================================

export const getPlatforms = async (): Promise<Platform[]> => {
  const platforms = await getCollection<Platform>('platforms');
  if (platforms.length === 0) {
    const def: Platform = { id: 'trendyol', name: 'Trendyol', defaultCommissionRate: 19, defaultServiceFee: 13.90 };
    platforms.push(def);
    await saveCollection('platforms', platforms);
  }
  return platforms;
};

export const savePlatform = async (platform: Platform): Promise<void> => {
  const platforms = await getPlatforms();
  const index = platforms.findIndex(p => p.id === platform.id);
  if (index >= 0) platforms[index] = platform;
  else platforms.push(platform);
  await saveCollection('platforms', platforms);
};

export const deletePlatform = async (id: string): Promise<void> =>
  saveCollection('platforms', (await getPlatforms()).filter(p => p.id !== id));

// ============================================================
// ASSETS & TRANSACTIONS
// ============================================================

export const getAssets = async (): Promise<Asset[]> =>
  getCollection<Asset>('assets');

export const saveAsset = async (asset: Asset): Promise<void> => {
  const assets = await getAssets();
  const index = assets.findIndex(a => a.id === asset.id);
  if (index >= 0) assets[index] = asset;
  else assets.push(asset);
  await saveCollection('assets', assets);
};

export const deleteAsset = async (id: string): Promise<void> =>
  saveCollection('assets', (await getAssets()).filter(a => a.id !== id));

export const getAssetTransactions = async (): Promise<AssetTransaction[]> =>
  getCollection<AssetTransaction>('asset_transactions');

export const saveAssetTransaction = async (tx: AssetTransaction): Promise<void> => {
  const txs = await getAssetTransactions();
  txs.unshift(tx);
  await saveCollection('asset_transactions', txs);
};

export const getInvestmentCash = async (): Promise<number> =>
  (await getAssetTransactions()).reduce((acc, tx) => {
    if (tx.type === 'deposit' || tx.type === 'sell') return acc + tx.total;
    if (tx.type === 'withdraw' || tx.type === 'buy') return acc - tx.total;
    return acc;
  }, 0);

// ============================================================
// SHIPPING SETTINGS
// ============================================================

export const getShippingSettings = async (): Promise<ShippingSettings> =>
  (await getSetting<ShippingSettings>('shipping_settings')) ?? { prices: {}, defaultPrice: 35, companies: [] };

export const saveShippingSettings = async (settings: ShippingSettings): Promise<void> =>
  saveSetting('shipping_settings', settings);

// ============================================================
// ANNOUNCEMENT SETTINGS
// ============================================================

export const getAnnouncementSettings = async (): Promise<AnnouncementSettings> =>
  (await getSetting<AnnouncementSettings>('announcement_settings')) ?? {
    isEnabled: true,
    showTodoReminder: true, todoReminderFrequency: 'every_login',
    showStockReminder: true, stockThreshold: 5, stockReminderFrequency: 'every_login',
    showTaxReminder: true, taxReminderFrequency: 'every_login',
    showDebtReminder: true, debtReminderFrequency: 'every_login',
    customAnnouncements: [],
  };

export const saveAnnouncementSettings = async (settings: AnnouncementSettings): Promise<void> =>
  saveSetting('announcement_settings', settings);
