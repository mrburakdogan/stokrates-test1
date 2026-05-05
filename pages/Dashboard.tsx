import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, TrendingDown, Wallet, Printer, Calendar, Percent } from 'lucide-react';
import { getCustomers, getProducts, getSales, getExpenses } from '../services/db';
import { Sale, Expense } from '../types';

const Dashboard: React.FC = () => {
  // Tarih State'leri (Varsayılan: Bu Ayın başından bugüne)
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalSalesCount: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalOutputVat: 0, 
    totalInputVat: 0, 
    netVatPayable: 0,
    filteredSales: [] as Sale[],
    filteredExpenses: [] as Expense[]
  });

  useEffect(() => {
    calculateStats();
  }, [startDate, endDate]);

  const setQuickFilter = (type: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = '';

    if (type === 'today') {
      start = end;
    } else if (type === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay() + 1); // Pazartesi
      start = d.toISOString().split('T')[0];
    } else if (type === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (type === 'year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }

    setStartDate(start);
    setEndDate(end);
  };

  const calculateStats = () => {
    const products = getProducts();
    const customers = getCustomers();
    const sales = getSales();
    const expenses = getExpenses();

    // Filtreleme Mantığı (Başlangıç ve Bitiş dahil)
    const isDateInRange = (dateStr: string) => {
      const d = dateStr.split('T')[0]; 
      return d >= startDate && d <= endDate;
    };

    const filteredSales = sales.filter(s => isDateInRange(s.date));
    const filteredExpenses = expenses.filter(e => isDateInRange(e.date));
    
    // Revenue Calculation: Exclude cancelled sales
    const activeSales = filteredSales.filter(s => s.status !== 'cancelled');

    const totalRevenue = activeSales.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    const totalOutputVat = activeSales.reduce((acc, curr) => acc + (curr.totalVat || 0), 0);
    const totalInputVat = filteredExpenses.reduce((acc, curr) => acc + (curr.vatAmount || 0), 0);
    const netVatPayable = totalOutputVat;

    const rawCashFlow = totalRevenue - totalExpenses;
    const netProfit = rawCashFlow - netVatPayable;

    setStats({
      totalProducts: products.length,
      totalCustomers: customers.length,
      totalSalesCount: activeSales.length, 
      totalRevenue,
      totalExpenses,
      netProfit,
      totalOutputVat,
      totalInputVat,
      netVatPayable,
      filteredSales: filteredSales.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10), 
      filteredExpenses: filteredExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const StatCard = ({ title, value, icon, color, subValue }: any) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4 print:border-gray-300">
      <div className={`p-3 rounded-lg ${color} text-white print:text-black print:bg-gray-200`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{value}</h3>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Genel Bakış</h1>
           <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">İşletmenizin anlık finansal durumu.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm w-full xl:w-auto">
          
          {/* Hızlı Filtre Butonları */}
          <div className="flex space-x-1 overflow-x-auto pb-1 sm:pb-0">
             <button onClick={() => setQuickFilter('today')} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 rounded-lg transition-colors whitespace-nowrap">Bugün</button>
             <button onClick={() => setQuickFilter('week')} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 rounded-lg transition-colors whitespace-nowrap">Bu Hafta</button>
             <button onClick={() => setQuickFilter('month')} className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg whitespace-nowrap">Bu Ay</button>
             <button onClick={() => setQuickFilter('year')} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 rounded-lg transition-colors whitespace-nowrap">Bu Yıl</button>
          </div>

          <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>

          {/* Tarih Aralığı Seçici - Light/Dark Theme */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none group">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-36 pl-3 pr-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                />
            </div>
            <span className="text-gray-300">-</span>
            <div className="relative flex-1 sm:flex-none group">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-36 pl-3 pr-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                />
            </div>
          </div>
          
          <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>

          <button 
            onClick={handlePrint}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition ml-auto sm:ml-0"
            title="Raporu Yazdır / PDF"
          >
            <Printer size={20} />
          </button>
        </div>
      </div>

      {/* Print Header (Visible only on print) */}
      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Finansal Rapor</h1>
        <p className="text-gray-600">
          Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')} <br/>
          Aralık: {new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
        <StatCard 
          title="Toplam Satış (Ciro)" 
          value={`₺${stats.totalRevenue.toLocaleString('tr-TR')}`}
          subValue={`${stats.totalSalesCount} adet aktif fiş`}
          icon={<TrendingUp size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Toplam Gider" 
          value={`₺${stats.totalExpenses.toLocaleString('tr-TR')}`} 
          icon={<TrendingDown size={24} />} 
          color="bg-red-500" 
        />
        <StatCard 
          title="Net Kâr (Vergi Düşülmüş)" 
          value={`₺${stats.netProfit.toLocaleString('tr-TR')}`} 
          subValue="Ciro - Gider - Ödenecek KDV"
          icon={<Wallet size={24} />} 
          color={stats.netProfit >= 0 ? "bg-green-500" : "bg-red-600"} 
        />
        <StatCard 
          title="Ödenecek KDV" 
          value={`₺${stats.netVatPayable.toLocaleString('tr-TR')}`}
          subValue={stats.netVatPayable > 0 ? "Devlete Ödenecek" : "Sonraki Aya Devir"}
          icon={<Percent size={24} />} 
          color={stats.netVatPayable > 0 ? "bg-orange-500" : "bg-gray-400"} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-8">
        {/* Recent Sales Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden print:border-gray-300">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center print:border-gray-300">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Son Satış İşlemleri</h2>
            <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full print:hidden">Gelir</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-sm print:bg-gray-100">
                <tr>
                  <th className="px-6 py-3">Tarih</th>
                  <th className="px-6 py-3">Müşteri/Detay</th>
                  <th className="px-6 py-3 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 print:divide-gray-200">
                {stats.filteredSales.length > 0 ? (
                  stats.filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                       <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                        {new Date(sale.date).toLocaleDateString('tr-TR')}
                        {sale.orderNumber && (
                           <div className="text-xs font-mono text-gray-400 mt-1">#{sale.orderNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-medium ${sale.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                            {sale.customerName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                            {sale.items ? `${sale.items.length} çeşit ürün` : 'Eski kayıt'}
                            {sale.status === 'cancelled' && <span className="ml-2 text-red-500 font-bold">İPTAL</span>}
                        </div>
                      </td>
                      <td className={`px-6 py-4 font-medium text-right ${sale.status === 'cancelled' ? 'text-red-500 line-through' : 'text-green-600 dark:text-green-400'}`}>
                          +₺{sale.totalAmount.toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Seçili tarihte kayıt yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Expenses Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden print:border-gray-300">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center print:border-gray-300">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Son Giderler</h2>
            <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-700 rounded-full print:hidden">Gider</span>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-sm print:bg-gray-100">
                <tr>
                  <th className="px-6 py-3">Tarih</th>
                  <th className="px-6 py-3">Kalem/Cins</th>
                  <th className="px-6 py-3 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 print:divide-gray-200">
                {stats.filteredExpenses.length > 0 ? (
                  stats.filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                        {new Date(expense.date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{expense.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                            {expense.category}
                            {expense.vatRate > 0 && <span className="ml-1 text-gray-400">({expense.vatRate}% KDV)</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium text-right">-₺{expense.amount.toLocaleString('tr-TR')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Seçili tarihte kayıt yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="text-center text-xs text-gray-400 mt-8 hidden print:block">
        Bu rapor EsnafTakip uygulaması tarafından oluşturulmuştur.
      </div>
    </div>
  );
};

export default Dashboard;