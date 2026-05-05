
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import NewSale from './pages/NewSale';
import SalesHistory from './pages/SalesHistory';
import Expenses from './pages/Expenses';
import DebtCreditTracking from './pages/DebtCreditTracking';
import CostCalculator from './pages/CostCalculator';
import ProductionCostAnalysis from './pages/ProductionCostAnalysis';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import TodoList from './pages/TodoList';
import Messages from './pages/Messages';
import TrendyolAnalysis from './pages/TrendyolAnalysis';
import Reports from './pages/Reports';
import { Menu, Moon, Sun, Bell, X, CheckSquare, Clock, Info, PackageSearch, AlertTriangle, Scale, Landmark, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { getCurrentUser, logoutUser, getTodos, getAnnouncementSettings, getProducts, getExpenses, getDebtCredits, initializeAppData, saveSale, saveCustomer, getCustomers, generateId } from './services/db';
import { User, Todo, CustomAnnouncement, Product, AnnouncementFrequency, Expense, DebtCredit, Sale, SaleItem } from './types';
import { UserProfileMenu } from './components/UserProfileMenu';
import { fetchTrendyolOrders } from './services/trendyol';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (localStorage.getItem('theme') === 'dark') return true;
    if (localStorage.getItem('theme') === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [dueTodayTodos, setDueTodayTodos] = useState<Todo[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [dueTaxes, setDueTaxes] = useState<Expense[]>([]);
  const [dueDebtCredits, setDueDebtCredits] = useState<DebtCredit[]>([]); 
  const [activeCustomAnnouncements, setActiveCustomAnnouncements] = useState<CustomAnnouncement[]>([]);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    // Supabase'den uygulama verilerini yükle
    initializeAppData();

    const user = getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
      checkAnnouncements();
      
      // Trendyol Arka Plan Senkronizasyonu (5 dakikada bir)
      const syncInterval = setInterval(() => {
        syncTrendyolInBackground();
      }, 5 * 60 * 1000);
      
      // İlk girişte hemen bir kez dene
      syncTrendyolInBackground();

      return () => clearInterval(syncInterval);
    }
  }, []);

  const syncTrendyolInBackground = async () => {
    try {
      const result = await fetchTrendyolOrders();
      if (result.success && result.data?.content) {
        const trendyolOrders = result.data.content;
        const currentProducts = getProducts();
        const currentCustomers = getCustomers();
        
        for (const order of trendyolOrders) {
          // Müşteri bul veya oluştur
          const customerName = `${order.customerFirstName} ${order.customerLastName}`;
          let customer = currentCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
          
          if (!customer) {
            customer = {
              id: generateId(),
              name: customerName,
              phone: '',
              address: order.shippingAddress?.fullAddress || '',
              gender: 'unspecified'
            };
            saveCustomer(customer);
            currentCustomers.push(customer); // Döngü içinde güncel kalsın
          }

          // Satış kalemlerini hazırla
          const items: SaleItem[] = order.lines.map((line: any) => {
            const product = currentProducts.find(p => p.code === line.merchantSku || p.barcode === line.barcode);
            return {
              productId: product?.id || 'manual',
              productName: line.productName,
              quantity: line.quantity,
              returnedQuantity: 0,
              unitPrice: line.price,
              totalPrice: line.price * line.quantity,
              vatRate: 20
            };
          });

          const newSale: Sale = {
            id: generateId(),
            orderNumber: order.orderNumber,
            customerId: customer.id,
            customerName: customer.name,
            items: items,
            subTotal: order.totalPrice,
            discount: 0,
            totalAmount: order.totalPrice,
            totalVat: order.totalPrice * 0.20,
            date: new Date(order.orderDate).toISOString(),
            status: order.shipmentPackageStatus === 'Cancelled' ? 'cancelled' : 'completed',
            platformId: 'trendyol'
          };

          saveSale(newSale);
        }
      }
    } catch (error) {
      console.error('Background Trendyol Sync Error:', error);
    }
  };

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const shouldShowAnnouncement = (freq: AnnouncementFrequency, key: string): boolean => {
    if (freq === 'every_login') {
        const hasSeenThisSession = sessionStorage.getItem(`seen_${key}`);
        return !hasSeenThisSession;
    }
    const lastSeen = localStorage.getItem(`last_seen_${key}`);
    if (!lastSeen) return true;
    const lastDate = new Date(parseInt(lastSeen));
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (freq === 'once_a_day') return diffDays >= 1;
    if (freq === 'once_a_week') return diffDays >= 7;
    if (freq === 'once_a_month') return diffDays >= 30;
    return true;
  };

  const markAnnouncementSeen = (key: string) => {
    const now = Date.now().toString();
    sessionStorage.setItem(`seen_${key}`, 'true');
    localStorage.setItem(`last_seen_${key}`, now);
  };

  const checkAnnouncements = () => {
    const settings = getAnnouncementSettings();
    if (!settings.isEnabled) return;
    let shouldShowModal = false;
    const pendingTodos: Todo[] = [];
    const criticalStockItems: Product[] = [];
    const pendingTaxes: Expense[] = [];
    const pendingDebts: DebtCredit[] = [];
    const pendingAnnouncements: CustomAnnouncement[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    if (settings.showTodoReminder && shouldShowAnnouncement(settings.todoReminderFrequency, 'todo_reminder')) {
        const todos = getTodos();
        const due = todos.filter(t => !t.isCompleted && t.endDate === todayStr);
        if (due.length > 0) { pendingTodos.push(...due); shouldShowModal = true; }
    }
    if (settings.showStockReminder && shouldShowAnnouncement(settings.stockReminderFrequency, 'stock_reminder')) {
        const allProducts = getProducts();
        const low = allProducts.filter(p => p.stock <= settings.stockThreshold);
        if (low.length > 0) { criticalStockItems.push(...low); shouldShowModal = true; }
    }
    if (settings.showTaxReminder && shouldShowAnnouncement(settings.taxReminderFrequency, 'tax_reminder')) {
        const allExpenses = getExpenses();
        const overdueTaxes = allExpenses.filter(e => e.isTax && !e.isPaid && e.date <= todayStr);
        if (overdueTaxes.length > 0) { pendingTaxes.push(...overdueTaxes); shouldShowModal = true; }
    }
    if (settings.showDebtReminder && shouldShowAnnouncement(settings.debtReminderFrequency, 'debt_reminder')) {
        const allDebtCredits = getDebtCredits();
        const pending = allDebtCredits.filter(item => !item.isCompleted && item.dueDate <= todayStr);
        if (pending.length > 0) { pendingDebts.push(...pending); shouldShowModal = true; }
    }
    settings.customAnnouncements.forEach(ann => {
        if (!ann.isActive) return;
        if (shouldShowAnnouncement(ann.frequency, `custom_ann_${ann.id}`)) { pendingAnnouncements.push(ann); shouldShowModal = true; }
    });

    if (shouldShowModal) {
        setDueTodayTodos(pendingTodos);
        setLowStockProducts(criticalStockItems);
        setDueTaxes(pendingTaxes);
        setDueDebtCredits(pendingDebts);
        setActiveCustomAnnouncements(pendingAnnouncements);
        setShowReminder(true);
        if (pendingTodos.length > 0) markAnnouncementSeen('todo_reminder');
        if (criticalStockItems.length > 0) markAnnouncementSeen('stock_reminder');
        if (pendingTaxes.length > 0) markAnnouncementSeen('tax_reminder');
        if (pendingDebts.length > 0) markAnnouncementSeen('debt_reminder');
        pendingAnnouncements.forEach(ann => markAnnouncementSeen(`custom_ann_${ann.id}`));
    }
  };

  const handleLogin = async () => {
    // Önce kullanıcının verilerini Supabase'den çek
    await initializeAppData();

    const user = getCurrentUser();
    if (user) {
        setIsAuthenticated(true);
        setCurrentUser(user);
        setTimeout(() => checkAnnouncements(), 100);
    }
  };

  const handleLogout = async () => {
      await logoutUser();
      Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('seen_')) sessionStorage.removeItem(key);
      });
      setIsAuthenticated(false);
      setCurrentUser(null);
      setShowReminder(false);
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
          role={currentUser?.role || 'user'}
        />

        <div className="flex-1 flex flex-col overflow-hidden w-full relative">
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 justify-between shrink-0 print:hidden transition-colors duration-200 z-10">
             <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-600 dark:text-gray-300 p-1 hover:bg-gray-100 rounded-lg transition-colors"><Menu size={24} /></button>
                <span className="lg:hidden text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">STOKrates</span>
                <span className="hidden lg:block text-sm text-gray-500 dark:text-gray-400">Hoşgeldin, <span className="font-semibold text-gray-700 dark:text-gray-200">{currentUser?.username}</span></span>
             </div>
             <div className="flex items-center gap-2 md:gap-4">
                <button onClick={toggleTheme} className="text-gray-500 dark:text-gray-400 p-2 rounded-full hover:bg-gray-100 transition-colors">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>
                {currentUser && <UserProfileMenu user={currentUser} onUpdate={(u) => { localStorage.setItem('user_session', JSON.stringify(u)); setCurrentUser(u); }} onLogout={handleLogout} />}
             </div>
          </header>

          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 print:p-0 print:bg-white transition-colors duration-200">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/products" element={<Products />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/sales" element={<NewSale />} />
              <Route path="/sales/:id" element={<NewSale />} />
              <Route path="/sales-history" element={<SalesHistory />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/debt-credits" element={<DebtCreditTracking />} />
              <Route path="/cost-calculator" element={<CostCalculator />} />
              <Route path="/production-cost" element={<ProductionCostAnalysis />} />
              <Route path="/trendyol-analysis" element={<TrendyolAnalysis />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/todos" element={<TodoList />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/users" element={currentUser?.role === 'admin' ? <UserManagement /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      {showReminder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up border border-blue-100 dark:border-gray-700">
                  <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                      <div className="flex items-center gap-3">
                          <Bell className="animate-bounce" size={24} />
                          <h3 className="text-xl font-bold">Önemli Bildirimler</h3>
                      </div>
                      <button onClick={() => setShowReminder(false)} className="hover:bg-indigo-500 p-1 rounded-lg transition-colors"><X size={24} /></button>
                  </div>
                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      {activeCustomAnnouncements.length > 0 && (
                          <div className="space-y-3">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Genel Duyurular</p>
                              {activeCustomAnnouncements.map(ann => (
                                  <div key={ann.id} className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/50 flex items-start gap-3">
                                      <Info className="text-purple-500 shrink-0 mt-0.5" size={18} />
                                      <p className="text-sm font-bold text-purple-900 dark:text-purple-200">{ann.text}</p>
                                  </div>
                              ))}
                          </div>
                      )}
                      {dueDebtCredits.length > 0 && (
                          <div className="space-y-3">
                              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-1">Vadesi Gelen Ödemeler & Tahsilatlar</p>
                              <div className="space-y-2">
                                  {dueDebtCredits.map(item => {
                                      const isOverdue = item.dueDate < new Date().toISOString().split('T')[0];
                                      return (
                                      <div key={item.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${item.type === 'debt' ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/50' : 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/50'}`}>
                                          <div className="flex items-center gap-3">
                                              {item.type === 'debt' ? <ArrowDownLeft className="text-red-500 shrink-0" size={20} /> : <ArrowUpRight className="text-green-500 shrink-0" size={20} />}
                                              <div><p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{item.title}</p><p className="text-[10px] text-gray-500 uppercase">{item.type === 'debt' ? 'Borç (Ödenecek)' : 'Alacak (Gelecek)'}</p></div>
                                          </div>
                                          <div className="text-right"><p className="text-xs font-black text-gray-800 dark:text-white">₺{item.amount.toLocaleString('tr-TR')}</p><p className={`text-[9px] font-bold ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>{isOverdue ? 'GECİKTİ' : 'BUGÜN'}</p></div>
                                      </div>
                                  )})}
                              </div>
                          </div>
                      )}
                      <button onClick={() => setShowReminder(false)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl shadow-lg transition-all active:scale-95">Anladım, Kapat</button>
                  </div>
              </div>
          </div>
      )}
    </HashRouter>
  );
};

export default App;
