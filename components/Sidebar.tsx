
import React from 'react';
import { LayoutDashboard, Package, Users, ShoppingCart, X, Wallet, Calculator, Sun, Moon, LogOut, UserCog, History, ListTodo, MessageSquare, Settings, BarChart2, PieChart, FlaskConical, Landmark } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { logoutUser } from '../services/db';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
  role: 'admin' | 'user';
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isDarkMode, toggleTheme, onLogout, role }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ path, label, icon }: { path: string, label: string, icon: React.ReactNode }) => (
    <Link
      to={path}
      onClick={() => setIsOpen(false)}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        isActive(path)
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );

  const handleLogout = () => {
      logoutUser();
      onLogout();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} print:hidden flex flex-col`}>
        {/* Header - Centered Logo */}
        <div className="relative flex items-center justify-center h-16 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">STOKrates</span>
          {/* Mobile Close Button (Absolute positioned to not affect centering) */}
          <button onClick={() => setIsOpen(false)} className="lg:hidden absolute right-4 text-gray-500 dark:text-gray-400">
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {/* General Group */}
          <NavItem path="/" label="Genel Bakış" icon={<LayoutDashboard size={20} />} />
          <NavItem path="/reports" label="Gelişmiş Raporlar" icon={<PieChart size={20} />} />
          <NavItem path="/todos" label="Yapılacaklar" icon={<ListTodo size={20} />} />

          {/* Income - Expense Group */}
          <div className="pt-4 pb-2 px-4">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Gelir - Gider</p>
          </div>
          <NavItem path="/sales" label="Satış Yap" icon={<ShoppingCart size={20} />} />
          <NavItem path="/sales-history" label="Satış Geçmişi" icon={<History size={20} />} />
          <NavItem path="/expenses" label="Giderler" icon={<Wallet size={20} />} />
          <NavItem path="/debt-credits" label="Borç & Alacak" icon={<Landmark size={20} />} />

          {/* Product Management Group */}
          <div className="pt-4 pb-2 px-4">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ürün Yönetimi ve Hesaplama</p>
          </div>
          <NavItem path="/products" label="Ürün Listesi" icon={<Package size={20} />} />
          <NavItem path="/production-cost" label="Üretim Maliyeti" icon={<FlaskConical size={20} />} />
          <NavItem path="/cost-calculator" label="Pazar Yeri Hesapla" icon={<Calculator size={20} />} />
          <NavItem path="/trendyol-analysis" label="Trendyol Analiz" icon={<BarChart2 size={20} />} />

          {/* Customer Relations Group */}
          <div className="pt-4 pb-2 px-4">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Cari ve Müşteri İlişkileri</p>
          </div>
          <NavItem path="/customers" label="Müşteriler" icon={<Users size={20} />} />
          <NavItem path="/messages" label="Mesaj Merkezi" icon={<MessageSquare size={20} />} />

          {/* System & Admin Group */}
          <div className="pt-4 pb-2 px-4">
             <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sistem</p>
          </div>
          <NavItem path="/settings" label="Ayarlar" icon={<Settings size={20} />} />
          
          {role === 'admin' && (
             <NavItem path="/users" label="Kullanıcılar" icon={<UserCog size={20} />} />
          )}
        </nav>
        
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 space-y-3">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
             {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
             <span className="text-sm font-medium">{isDarkMode ? 'Açık Mod' : 'Koyu Mod'}</span>
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
             <LogOut size={18} />
             <span className="text-sm font-medium">Çıkış Yap</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
