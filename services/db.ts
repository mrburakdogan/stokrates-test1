import { supabase } from './supabase';
import { Product, Customer, Sale, Expense, User, Todo, ProductHistoryEntry, MessageTemplate, MessageLog, TrendyolConfig, SystemLog, ShippingSettings, AnnouncementSettings, DebtCredit, TrendyolAnalysisRecord, Asset, AssetTransaction, Platform } from '../types';

// ============================================================
// IN-MEMORY STORE (birincil veri kaynağı)
// Uygulama açılırken Supabase'den yüklenir.
// Her yazma işlemi hem belleği hem Supabase'i günceller.
// ============================================================

const _store: Record<string, any[]> = {};
const _settings: Record<string, any> = {};

function getCollection<T>(key: string): T[] {
  if (!(key in _store)) {
    // Supabase henüz yüklenmemişse localStorage'dan oku
    const raw = localStorage.getItem(key);
    _store[key] = raw ? JSON.parse(raw) : [];
  }
  return _store[key] as T[];
}

function saveCollection<T>(key: string, data: T[]): void {
  _store[key] = data;
  localStorage.setItem(key, JSON.stringify(data)); // offline yedek
  _syncCollection(key, data).catch(err => console.error('Background sync failed:', err));
}

function getLocalSetting<T>(key: string): T | null {
  if (key in _settings) return _settings[key] as T;
  const raw = localStorage.getItem(key);
  if (raw) {
    _settings[key] = JSON.parse(raw);
    return _settings[key];
  }
  return null;
}

function saveSetting<T>(key: string, value: T): void {
  _settings[key] = value;
  localStorage.setItem(key, JSON.stringify(value));
  _syncSetting(key, value);
}

// ============================================================
// SUPABASE SYNC (arka planda çalışır, hata olursa sessizce geçer)
// ============================================================

async function _syncCollection<T>(key: string, data: T[]): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return; // Sadece giriş yapılmışsa senkronize et

    const deleteResult = await supabase.from('app_data').delete().eq('collection', key);
    if (deleteResult.error) {
      console.error(`[Supabase] DELETE hatası (${key}):`, deleteResult.error);
    }
    
    if (data.length > 0) {
      const rows = data.map((item: any) => ({
        user_id: user.id,
        collection: key,
        item_id: item.id ?? key,
        data: item,
      }));
      
      // Çok büyük verileri (örn. uzun history içeren ürünler) engellemek için 50'şerli gruplar halinde kaydet
      const CHUNK_SIZE = 50;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const insertResult = await supabase.from('app_data').insert(chunk);
        if (insertResult.error) {
          console.error(`[Supabase] INSERT hatası (${key} - chunk ${i}):`, insertResult.error);
          throw insertResult.error; // Hata fırlat ki restoreDatabase bunu yakalayıp kullanıcıya bildirsin
        }
      }
      console.log(`[Supabase] ✓ ${key} başarıyla kaydedildi (${rows.length} item)`);
    }
  } catch (err) {
    console.error(`[Supabase] Koleksiyon sync hatası (${key}):`, err);
    throw err; // Hatayı yukarı ilet
  }
}

async function _syncSetting<T>(key: string, value: T): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const result = await supabase.from('app_settings').upsert({ user_id: user.id, key, value });
    if (result.error) {
      console.error(`[Supabase] Ayar sync hatası (${key}):`, result.error);
    } else {
      console.log(`[Supabase] ✓ ${key} başarıyla kaydedildi`);
    }
  } catch (err) {
    console.error(`[Supabase] Ayar sync hatası (${key}):`, err);
  }
}

// ============================================================
// BAŞLANGIÇ: Uygulama açılırken Supabase'den verileri çek
// App.tsx içinde bir kez çağrılır.
// ============================================================

const COLLECTIONS = [
  'products', 'customers', 'sales', 'expenses', 'users', 'todos',
  'debt_credits', 'msg_templates', 'messages_log', 'system_logs',
  'trendyol_analyses', 'platforms', 'assets', 'asset_transactions',
];
const SETTING_KEYS = ['trendyol_config', 'shipping_settings', 'announcement_settings'];

export const initializeAppData = async (): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    for (const col of COLLECTIONS) {
      const { data, error } = await supabase
        .from('app_data')
        .select('data')
        .eq('collection', col);
      if (!error && data && data.length > 0) {
        const items = data.map((r: any) => r.data);
        _store[col] = items;
        localStorage.setItem(col, JSON.stringify(items));
      }
    }

    for (const key of SETTING_KEYS) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (!error && data) {
        _settings[key] = data.value;
        localStorage.setItem(key, JSON.stringify(data.value));
      }
    }
  } catch (err) {
    console.warn('[Supabase] Başlangıç verisi yüklenemedi, yerel veriler kullanılıyor:', err);
  }
};

// ============================================================
// HELPERS
// ============================================================

export const generateId = (): string =>
  Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

// ============================================================
// PORTFOLIO & ASSETS
// ============================================================

export const getAssets = (): Asset[] => getCollection<Asset>('assets');

export const saveAsset = (asset: Asset): void => {
  const assets = getAssets();
  const index = assets.findIndex(a => a.id === asset.id);
  if (index >= 0) assets[index] = asset;
  else assets.push(asset);
  saveCollection('assets', assets);
};

export const deleteAsset = (id: string): void =>
  saveCollection('assets', getAssets().filter(a => a.id !== id));

export const getAssetTransactions = (): AssetTransaction[] =>
  getCollection<AssetTransaction>('asset_transactions');

export const saveAssetTransaction = (tx: AssetTransaction): void => {
  const txs = getAssetTransactions();
  txs.unshift(tx);
  saveCollection('asset_transactions', txs);
};

export const getInvestmentCash = (): number =>
  getAssetTransactions().reduce((acc, tx) => {
    if (tx.type === 'deposit' || tx.type === 'sell') return acc + tx.total;
    if (tx.type === 'withdraw' || tx.type === 'buy') return acc - tx.total;
    return acc;
  }, 0);

export const saveInvestmentCash = (_amount: number): void => {
  // Nakit, işlemlerden hesaplanıyor; bu fonksiyon yalnızca uyumluluk için tutuluyor.
};

// ============================================================
// TRENDYOL ANALİZ
// ============================================================

export const getTrendyolAnalyses = (): TrendyolAnalysisRecord[] =>
  getCollection<TrendyolAnalysisRecord>('trendyol_analyses');

export const saveTrendyolAnalysis = (record: TrendyolAnalysisRecord): void => {
  const records = getTrendyolAnalyses();
  records.unshift(record);
  if (records.length > 50) records.pop();
  saveCollection('trendyol_analyses', records);
};

export const getTrendyolAnalysisForDate = (date: string): TrendyolAnalysisRecord | null => {
  const targetDate = date.split('T')[0];
  return getTrendyolAnalyses().find(r => targetDate >= r.startDate && targetDate <= r.endDate) || null;
};

export const deleteTrendyolAnalysis = (id: string): void =>
  saveCollection('trendyol_analyses', getTrendyolAnalyses().filter(r => r.id !== id));

// ============================================================
// BORÇ / ALACAK
// ============================================================

export const getDebtCredits = (): DebtCredit[] => getCollection<DebtCredit>('debt_credits');

export const saveDebtCredit = (data: DebtCredit): void => {
  const items = getDebtCredits();
  const index = items.findIndex(i => i.id === data.id);
  if (index >= 0) items[index] = data;
  else items.push(data);
  saveCollection('debt_credits', items);
};

export const deleteDebtCredit = (id: string): void =>
  saveCollection('debt_credits', getDebtCredits().filter(i => i.id !== id));

// ============================================================
// ÜRÜNLER
// ============================================================

export const getProducts = (): Product[] => getCollection<Product>('products');

export const saveProduct = (product: Product): void => {
  const products = getProducts();
  const index = products.findIndex(p => p.id === product.id);
  const username = getCurrentUser()?.username ?? 'Sistem';

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
      changes: [{ field: 'Genel', oldValue: '-', newValue: 'Ürün oluşturuldu' }],
    };
    product.history = [entry];
    products.push(product);
  }
  saveCollection('products', products);
};

export const deleteProduct = (id: string): void =>
  saveCollection('products', getProducts().filter(p => p.id !== id));

// ============================================================
// MÜŞTERİLER
// ============================================================

export const getCustomers = (): Customer[] => getCollection<Customer>('customers');

export const saveCustomer = (customer: Customer): void => {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === customer.id);
  if (index >= 0) customers[index] = customer;
  else customers.push(customer);
  saveCollection('customers', customers);
};

export const deleteCustomer = (id: string): void =>
  saveCollection('customers', getCustomers().filter(c => c.id !== id));

// ============================================================
// SATIŞLAR
// ============================================================

export const getSales = (): Sale[] => getCollection<Sale>('sales');

export const saveSale = (sale: Sale): void => {
  if (!sale.status) sale.status = 'completed';
  const sales = getSales();
  const products = getProducts();
  const index = sales.findIndex(s => s.id === sale.id);

  if (index >= 0) {
    const oldSale = sales[index];
    if (oldSale.status !== 'cancelled') {
      oldSale.items.forEach(item => {
        const pi = products.findIndex(p => p.id === item.productId);
        if (pi >= 0) products[pi].stock += item.quantity - (item.returnedQuantity || 0);
      });
    }
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
  saveCollection('products', products);
  saveCollection('sales', sales);
};

export const processSaleReturn = (saleId: string, returns: { productId: string; returnQty: number }[]): void => {
  const sales = getSales();
  const products = getProducts();
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
  saveCollection('products', products);
  saveCollection('sales', sales);
};

export const cancelSale = (saleId: string): void => {
  const sales = getSales();
  const saleIndex = sales.findIndex(s => s.id === saleId);
  if (saleIndex === -1) return;
  const sale = sales[saleIndex];
  if (sale.status === 'cancelled') return;
  const products = getProducts();
  sale.items.forEach(item => {
    const pi = products.findIndex(p => p.id === item.productId);
    if (pi >= 0) products[pi].stock += item.quantity - (item.returnedQuantity || 0);
  });
  saveCollection('products', products);
  sales[saleIndex].status = 'cancelled';
  saveCollection('sales', sales);
};

export const deleteSale = (saleId: string): void => {
  const sales = getSales();
  const sale = sales.find(s => s.id === saleId);
  if (!sale) return;
  if (sale.status !== 'cancelled') {
    const products = getProducts();
    sale.items.forEach(item => {
      const pi = products.findIndex(p => p.id === item.productId);
      if (pi >= 0) products[pi].stock += item.quantity - (item.returnedQuantity || 0);
    });
    saveCollection('products', products);
  }
  saveCollection('sales', sales.filter(s => s.id !== saleId));
};

// ============================================================
// GİDERLER
// ============================================================

export const getExpenses = (): Expense[] => getCollection<Expense>('expenses');

export const saveExpense = (expense: Expense): void => {
  const expenses = getExpenses();
  const index = expenses.findIndex(e => e.id === expense.id);
  if (index >= 0) expenses[index] = expense;
  else expenses.push(expense);
  saveCollection('expenses', expenses);
};

export const deleteExpense = (id: string): void =>
  saveCollection('expenses', getExpenses().filter(e => e.id !== id));

// ============================================================
// KULLANICILAR
// ============================================================

export const getUsers = (): User[] => {
  const users = getCollection<User>('users');
  if (users.length === 0) {
    const admin: User = {
      id: 'admin', username: 'admin', email: 'admin@stokrates.com',
      password: '123', role: 'admin', createdAt: new Date().toISOString(),
    };
    users.push(admin);
    saveCollection('users', users);
  }
  return users;
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) users[index] = user;
  else users.push(user);
  saveCollection('users', users);
};

export const deleteUser = (id: string): void =>
  saveCollection('users', getUsers().filter(u => u.id !== id));

export const getCurrentUser = (): User | null => {
  const session = localStorage.getItem('user_session');
  return session ? JSON.parse(session) : null;
};

export const loginUser = (user: User): void =>
  localStorage.setItem('user_session', JSON.stringify(user));

export const logoutUser = async (): Promise<void> => {
  localStorage.removeItem('user_session');
  await supabase.auth.signOut();
  
  // Clear local cache completely to prevent data leaking to another user logging in
  const theme = localStorage.getItem('theme');
  const rememberMe = localStorage.getItem('remember_me');
  const rememberedEmail = localStorage.getItem('remembered_email');
  const rememberedPassword = localStorage.getItem('remembered_password');
  
  localStorage.clear();
  
  if (theme) localStorage.setItem('theme', theme);
  if (rememberMe) {
    localStorage.setItem('remember_me', rememberMe);
    if (rememberedEmail) localStorage.setItem('remembered_email', rememberedEmail);
    if (rememberedPassword) localStorage.setItem('remembered_password', rememberedPassword);
  }
  
  // Clear memory store
  for (const key in _store) {
    _store[key] = [];
  }
  for (const key in _settings) {
    delete _settings[key];
  }
};

// ============================================================
// YAPILACAKLAR (TODOS)
// ============================================================

export const getTodos = (): Todo[] => getCollection<Todo>('todos');

export const saveTodo = (todo: Todo): void => {
  const todos = getTodos();
  const index = todos.findIndex(t => t.id === todo.id);
  if (index >= 0) todos[index] = todo;
  else todos.push(todo);
  saveCollection('todos', todos);
};

export const deleteTodo = (id: string): void =>
  saveCollection('todos', getTodos().filter(t => t.id !== id));

// ============================================================
// MESAJ ŞABLONLARı
// ============================================================

export const getTemplates = (): MessageTemplate[] => getCollection<MessageTemplate>('msg_templates');

export const saveTemplate = (template: MessageTemplate): void => {
  const templates = getTemplates();
  const index = templates.findIndex(t => t.id === template.id);
  if (index >= 0) templates[index] = template;
  else templates.push(template);
  saveCollection('msg_templates', templates);
};

export const deleteTemplate = (id: string): void =>
  saveCollection('msg_templates', getTemplates().filter(t => t.id !== id));

// ============================================================
// MESAJ LOGLARI
// ============================================================

export const getMessageLogs = (): MessageLog[] => getCollection<MessageLog>('messages_log');

export const saveMessageLog = (log: MessageLog): void => {
  const logs = getMessageLogs();
  logs.unshift(log);
  saveCollection('messages_log', logs);
};

export const deleteMessageLog = (id: string): void =>
  saveCollection('messages_log', getMessageLogs().filter(l => l.id !== id));

// ============================================================
// TRENDYOL KONFİGÜRASYON
// ============================================================

export const getTrendyolConfig = (): TrendyolConfig | null =>
  getLocalSetting<TrendyolConfig>('trendyol_config');

export const saveTrendyolConfig = (config: TrendyolConfig): void =>
  saveSetting('trendyol_config', config);

// ============================================================
// SİSTEM LOGLARI
// ============================================================

export const getSystemLogs = (): SystemLog[] => getCollection<SystemLog>('system_logs');

export const saveSystemLog = (log: SystemLog): void => {
  const logs = getSystemLogs();
  logs.unshift(log);
  if (logs.length > 100) logs.pop();
  saveCollection('system_logs', logs);
};

export const clearSystemLogs = (): void => {
  _store['system_logs'] = [];
  localStorage.removeItem('system_logs');
  _syncCollection('system_logs', []);
};

// ============================================================
// PLATFORMLAR
// ============================================================

export const getPlatforms = (): Platform[] => {
  const platforms = getCollection<Platform>('platforms');
  if (platforms.length === 0) {
    const def: Platform = { id: 'trendyol', name: 'Trendyol', defaultCommissionRate: 19, defaultServiceFee: 13.90 };
    platforms.push(def);
    saveCollection('platforms', platforms);
  }
  return platforms;
};

export const savePlatform = (platform: Platform): void => {
  const platforms = getPlatforms();
  const index = platforms.findIndex(p => p.id === platform.id);
  if (index >= 0) platforms[index] = platform;
  else platforms.push(platform);
  saveCollection('platforms', platforms);
};

export const deletePlatform = (id: string): void =>
  saveCollection('platforms', getPlatforms().filter(p => p.id !== id));

// ============================================================
// KARGO AYARLARI
// ============================================================

export const getShippingSettings = (): ShippingSettings =>
  getLocalSetting<ShippingSettings>('shipping_settings') ?? { prices: {}, defaultPrice: 35, companies: [] };

export const saveShippingSettings = (settings: ShippingSettings): void =>
  saveSetting('shipping_settings', settings);

// ============================================================
// DUYURU AYARLARI
// ============================================================

export const getAnnouncementSettings = (): AnnouncementSettings =>
  getLocalSetting<AnnouncementSettings>('announcement_settings') ?? {
    isEnabled: true,
    showTodoReminder: true, todoReminderFrequency: 'every_login',
    showStockReminder: true, stockThreshold: 5, stockReminderFrequency: 'every_login',
    showTaxReminder: true, taxReminderFrequency: 'every_login',
    showDebtReminder: true, debtReminderFrequency: 'every_login',
    customAnnouncements: [],
  };

export const saveAnnouncementSettings = (settings: AnnouncementSettings): void =>
  saveSetting('announcement_settings', settings);

// ============================================================
// VERİTABANI GERİ YÜKLEME
// ============================================================

export const restoreDatabase = async (data: any): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { success: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };

    const saveLocally = (key: string, items: any[]) => {
      _store[key] = items;
      localStorage.setItem(key, JSON.stringify(items));
    };

    const collections = [
      { key: 'products', items: data.products },
      { key: 'customers', items: data.customers },
      { key: 'sales', items: data.sales },
      { key: 'expenses', items: data.expenses },
      { key: 'todos', items: data.todos },
      { key: 'debt_credits', items: data.debt_credits },
      { key: 'msg_templates', items: data.templates },
      { key: 'messages_log', items: data.messageLogs },
      { key: 'system_logs', items: data.systemLogs },
      { key: 'trendyol_analyses', items: data.trendyol_analyses },
      { key: 'platforms', items: data.platforms },
      { key: 'assets', items: data.assets },
      { key: 'asset_transactions', items: data.asset_transactions }
    ];

    // Koleksiyonları teker teker işle ve bekle (Çok büyük boyutları engellemek için)
    for (const col of collections) {
      if (col.items && Array.isArray(col.items)) {
        saveLocally(col.key, col.items);
        await _syncCollection(col.key, col.items);
      }
    }

    // Ayarları güncelle
    const settingsMap = [
      { key: 'trendyol_config', val: data.trendyolConfig },
      { key: 'shipping_settings', val: data.shippingSettings },
      { key: 'announcement_settings', val: data.announcementSettings }
    ];

    for (const setting of settingsMap) {
      if (setting.val) {
        _settings[setting.key] = setting.val;
        localStorage.setItem(setting.key, JSON.stringify(setting.val));
        await _syncSetting(setting.key, setting.val);
      }
    }

    return { success: true, message: 'Veriler başarıyla geri yüklendi ve buluta senkronize edildi.' };
  } catch (e: any) {
    console.error('Restore Error', e);
    return { success: false, message: e.message || 'Geri yükleme hatası' };
  }
};
