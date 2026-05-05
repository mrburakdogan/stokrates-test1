
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, Package, Users, ArrowUpRight, ArrowDownRight, Printer, RefreshCw, BarChart3, PieChart as PieChartIcon, ChevronDown, Activity, DollarSign, Wallet, Star, Clock, ShoppingBag, Megaphone, Target, MousePointer2, Eye, LayoutGrid, Info, RotateCcw } from 'lucide-react';
import { getSales, getExpenses, getCustomers, getProducts, getShippingSettings } from '../services/db';
import { Sale, Expense, Customer, Product } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#22C55E', '#F97316', '#6366F1'];

type ReportType = 'revenue' | 'quantity' | 'customer_loyalty' | 'expenses' | 'ad_performance' | 'profitability' | 'returns';

const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedReport, setSelectedReport] = useState<ReportType>('profitability');
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDarkMode(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const chartTheme = {
    text: isDarkMode ? '#9CA3AF' : '#4B5563',
    grid: isDarkMode ? '#374151' : '#E5E7EB',
    tooltipBg: isDarkMode ? '#1F2937' : '#FFFFFF',
    tooltipBorder: isDarkMode ? '#374151' : '#E5E7EB',
    tooltipText: isDarkMode ? '#F3F4F6' : '#111827'
  };

  const [data, setData] = useState({ 
    sales: [] as Sale[], 
    expenses: [] as Expense[], 
    customers: [] as Customer[], 
    products: [] as Product[],
    shipping: { prices: {}, defaultPrice: 0 } as any
  });

  useEffect(() => {
    setData({ 
        sales: getSales(), 
        expenses: getExpenses(), 
        customers: getCustomers(), 
        products: getProducts(),
        shipping: getShippingSettings()
    });
  }, []);

  const filteredData = useMemo(() => {
    const s = data.sales.filter(sale => {
        const d = sale.date.split('T')[0];
        return d >= startDate && d <= endDate && sale.status !== 'cancelled';
    });
    const e = data.expenses.filter(exp => exp.date >= startDate && exp.date <= endDate);
    return { sales: s, expenses: e };
  }, [data, startDate, endDate]);

  const reportData = useMemo(() => {
    const results: any = {
      revenue: [], quantity: [], expenses: [], balance: [],
      loyalty: [] as any[],
      profitability: [] as any[],
      returns: [] as any[],
      ads: { totalSpend: 0, totalRevenue: 0, campaigns: [] as any[], platforms: [] as any[] },
      totals: { income: 0, expense: 0, profit: 0, netProfit: 0, returnLoss: 0, returnCount: 0, salesVat: 0, commissionVat: 0, shippingVat: 0 }
    };

    const productStats: Record<string, any> = {};
    const customerStats: Record<string, { name: string, total: number, count: number }> = {};
    const expenseStats: Record<string, number> = {};
    const platformStats: Record<string, { spend: number, revenue: number }> = {};
    
    // --- 1. Satış Analizi ---
    filteredData.sales.forEach(sale => {
      const discountRatio = sale.subTotal > 0 ? (sale.subTotal - sale.discount) / sale.subTotal : 1;
      
      // Müşteri Sadakati
      if (!customerStats[sale.customerId]) {
          customerStats[sale.customerId] = { name: sale.customerName, total: 0, count: 0 };
      }
      customerStats[sale.customerId].total += sale.totalAmount;
      customerStats[sale.customerId].count += 1;

      const saleTotalQty = sale.items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
      const saleCalculatedDesi = saleTotalQty > 0 ? Math.ceil(saleTotalQty / 5) : 0;
      const saleTotalShipping = data.shipping.prices[saleCalculatedDesi] || (saleTotalQty > 0 ? (data.shipping.prices[1] || 35) : 0);
      const shippingPerUnit = saleTotalQty > 0 ? saleTotalShipping / saleTotalQty : 0;

      sale.items.forEach(item => {
        if (!productStats[item.productId]) {
            productStats[item.productId] = { name: item.productName, total: 0, qty: 0, returnedQty: 0, returnValue: 0, totalCost: 0, totalShipping: 0, totalVat: 0, netProfit: 0 };
        }
        const stats = productStats[item.productId];
        const product = data.products.find(p => p.id === item.productId);
        
        const itemOriginalQty = Number(item.quantity || 0);
        const itemReturnedQty = Number(item.returnedQuantity || 0);
        const itemFinalPriceLine = (item.totalPrice || 0) * discountRatio;
        const unitPriceAfterDiscount = itemOriginalQty > 0 ? itemFinalPriceLine / itemOriginalQty : 0;
        
        const itemReturnedValue = unitPriceAfterDiscount * itemReturnedQty;
        const netQuantity = itemOriginalQty - itemReturnedQty;
        const netItemFinalPrice = itemFinalPriceLine - itemReturnedValue;
        
        const itemVatAmountTotal = (item.vatAmount || 0) * discountRatio;
        
        const itemUnitCostMatrah = (product?.cost || 0);
        const itemTotalCost = itemUnitCostMatrah * netQuantity;
        const itemTotalShipping = (shippingPerUnit * netQuantity);

        const commRate = sale.commissionRate || 19;
        const serviceFee = sale.serviceFee || 13.90;
        const itemCommissionNet = (netItemFinalPrice * (commRate / 100));
        const itemServiceFeeNet = (serviceFee * netQuantity);

        const itemVatAmountNet = itemVatAmountTotal * (netQuantity / (itemOriginalQty || 1));
        const itemCommissionVat = (itemCommissionNet + itemServiceFeeNet) * 0.20;
        const itemShippingVat = itemTotalShipping * 0.20;
        const itemPayableVat = itemVatAmountNet - itemCommissionVat - itemShippingVat;

        const itemNetProfit = netItemFinalPrice - itemPayableVat - itemTotalCost - itemTotalShipping - itemCommissionNet - itemServiceFeeNet;

        stats.total += netItemFinalPrice;
        stats.qty += netQuantity;
        stats.returnedQty += itemReturnedQty;
        stats.returnValue += itemReturnedValue;
        stats.totalCost += itemTotalCost;
        stats.totalShipping += itemTotalShipping;
        stats.netProfit += itemNetProfit;

        results.totals.income += netItemFinalPrice;
        results.totals.netProfit += itemNetProfit;
        results.totals.returnLoss += itemReturnedValue;
        results.totals.returnCount += itemReturnedQty;
        results.totals.salesVat += itemVatAmountNet;
        results.totals.commissionVat += itemCommissionVat;
        results.totals.shippingVat += itemShippingVat;
      });
    });

    // --- 2. Gider ve Reklam Analizi ---
    filteredData.expenses.forEach(exp => {
        if (exp.isAd) {
            results.ads.totalSpend += exp.amount;
            results.ads.totalRevenue += (exp.adRevenue || 0);
            results.ads.campaigns.push({
                name: exp.title,
                spend: exp.amount,
                revenue: exp.adRevenue || 0,
                roas: (exp.adRevenue || 0) / (exp.amount || 1),
                clicks: exp.clicks || 0,
                cpc: (exp.amount) / (exp.clicks || 1)
            });

            const platform = exp.platform || 'Diğer';
            if (!platformStats[platform]) platformStats[platform] = { spend: 0, revenue: 0 };
            platformStats[platform].spend += exp.amount;
            platformStats[platform].revenue += (exp.adRevenue || 0);
        } else if (!exp.isTax) {
            expenseStats[exp.category] = (expenseStats[exp.category] || 0) + exp.amount;
        }
        results.totals.expense += exp.amount;
    });

    // Final Map and Sort
    results.revenue = Object.values(productStats).sort((a, b) => b.total - a.total).slice(0, 10);
    results.profitability = Object.values(productStats).sort((a, b) => b.netProfit - a.netProfit);
    results.returns = Object.values(productStats).filter(p => p.returnedQty > 0).sort((a,b) => b.returnValue - a.returnValue);
    results.loyalty = Object.values(customerStats).sort((a,b) => b.total - a.total).slice(0, 10);
    results.expenses = Object.entries(expenseStats).map(([name, value]) => ({ name, value }));
    results.ads.platforms = Object.entries(platformStats).map(([name, data]) => ({ name, spend: data.spend, revenue: data.revenue }));

    // Trend Analizi
    const trendMap: Record<string, { date: string, gelir: number, iade: number }> = {};
    let curr = new Date(startDate);
    const last = new Date(endDate);
    while (curr <= last) {
      const dStr = curr.toISOString().split('T')[0];
      trendMap[dStr] = { date: dStr.split('-').reverse().slice(0,2).join('/'), gelir: 0, iade: 0 };
      curr.setDate(curr.getDate() + 1);
    }
    filteredData.sales.forEach(s => { 
        const dateKey = s.date.split('T')[0];
        if (trendMap[dateKey]) {
            const discountRatio = s.subTotal > 0 ? (s.subTotal - s.discount) / s.subTotal : 1;
            s.items.forEach(i => {
                const itemRetQty = Number(i.returnedQuantity || 0);
                const itemOriginalQty = Number(i.quantity || 0);
                const unitPrice = ((i.totalPrice || 0) * discountRatio) / (itemOriginalQty || 1);
                trendMap[dateKey].iade += unitPrice * itemRetQty;
                trendMap[dateKey].gelir += unitPrice * (itemOriginalQty - itemRetQty);
            });
        }
    });
    results.balance = Object.values(trendMap);

    return results;
  }, [filteredData, startDate, endDate, data]);

  const commonTooltip = {
    contentStyle: { backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, borderRadius: '12px', color: chartTheme.tooltipText }
  };

  const renderActiveReport = () => {
    switch (selectedReport) {
      case 'returns':
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatMini title="Toplam İade Kaybı" value={`₺${reportData.totals.returnLoss.toLocaleString('tr-TR')}`} icon={<RotateCcw/>} color="text-red-600" bg="bg-red-50" />
                    <StatMini title="İade Edilen Adet" value={`${reportData.totals.returnCount} Adet`} icon={<Package/>} color="text-orange-600" bg="bg-orange-50" />
                    <StatMini title="İade/Ciro Oranı" value={`%${((reportData.totals.returnLoss / (reportData.totals.income + reportData.totals.returnLoss || 1)) * 100).toFixed(1)}`} icon={<Activity/>} color="text-purple-600" bg="bg-purple-50" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard title="Ürün Bazlı İade Kaybı (₺)" icon={<DollarSign size={18}/>}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reportData.returns.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                                <XAxis dataKey="name" tick={{fontSize: 9, fill: chartTheme.text}} height={50} interval={0} angle={-20} textAnchor="end" />
                                <YAxis tick={{fontSize: 10, fill: chartTheme.text}} />
                                <Tooltip {...commonTooltip} formatter={(val: any) => `₺${val.toLocaleString()}`} />
                                <Bar dataKey="returnValue" name="İade Tutarı" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Günlük İade Trendi" icon={<Activity size={18}/>}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={reportData.balance}>
                                <defs><linearGradient id="colorIade" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                                <XAxis dataKey="date" tick={{fontSize: 9, fill: chartTheme.text}} />
                                <YAxis tick={{fontSize: 10, fill: chartTheme.text}} />
                                <Tooltip {...commonTooltip} />
                                <Area type="monotone" dataKey="iade" name="İade Tutarı" stroke="#EF4444" fillOpacity={1} fill="url(#colorIade)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>
        );
      case 'customer_loyalty':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="En Değerli Müşteriler (Ciro Bazlı)" icon={<Star size={18}/>}>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={reportData.loyalty} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartTheme.grid} />
                            <XAxis type="number" tick={{fontSize: 10, fill: chartTheme.text}} />
                            <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: chartTheme.text}} width={100} />
                            <Tooltip {...commonTooltip} />
                            <Bar dataKey="total" name="Toplam Harcama" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 font-bold flex items-center gap-2">
                        <Users size={18} className="text-blue-500" /> Sadakat Detay Listesi
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Müşteri</th>
                                    <th className="px-6 py-4 text-center">İşlem Sayısı</th>
                                    <th className="px-6 py-4 text-right">Toplam Ciro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {reportData.loyalty.map((c: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">{c.name}</td>
                                        <td className="px-6 py-4 text-center text-blue-600 font-bold">{c.count} Sipariş</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-green-600">₺{c.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          </div>
        );
      case 'ad_performance':
        const avgRoas = reportData.ads.totalRevenue / (reportData.ads.totalSpend || 1);
        return (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatMini title="Toplam Reklam Harcaması" value={`₺${reportData.ads.totalSpend.toLocaleString('tr-TR')}`} icon={<Megaphone/>} color="text-purple-600" bg="bg-purple-50" />
                <StatMini title="Reklam Kaynaklı Ciro" value={`₺${reportData.ads.totalRevenue.toLocaleString('tr-TR')}`} icon={<Target/>} color="text-green-600" bg="bg-green-50" />
                <StatMini title="Ortalama ROAS" value={`${avgRoas.toFixed(2)}x`} icon={<TrendingUp/>} color="text-blue-600" bg="bg-blue-50" />
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Platform Bazlı Harcama Dağılımı" icon={<PieChartIcon size={18}/>}>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={reportData.ads.platforms} dataKey="spend" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {reportData.ads.platforms.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip {...commonTooltip} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Harcama vs Getiri Analizi" icon={<Activity size={18}/>}>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.ads.platforms}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: chartTheme.text}} />
                            <YAxis tick={{fontSize: 10, fill: chartTheme.text}} />
                            <Tooltip {...commonTooltip} />
                            <Legend verticalAlign="top" height={36}/>
                            <Bar dataKey="spend" name="Harcama" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="revenue" name="Getiri" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
             </div>
          </div>
        );
      case 'expenses':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
             <ChartCard title="Gider Kategorileri Dağılımı" icon={<Wallet size={18}/>}>
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie data={reportData.expenses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                            {reportData.expenses.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...commonTooltip} />
                    </PieChart>
                </ResponsiveContainer>
             </ChartCard>
             <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-center">
                 <h4 className="text-sm font-bold text-gray-400 uppercase mb-4">Gider Özeti</h4>
                 <div className="space-y-4">
                     {reportData.expenses.map((e: any, idx: number) => (
                         <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                             <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{e.name}</span>
                             </div>
                             <span className="text-sm font-bold text-gray-900 dark:text-white">₺{e.value.toLocaleString()}</span>
                         </div>
                     ))}
                     <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                         <span className="font-bold text-gray-800 dark:text-white text-lg">Toplam Gider</span>
                         <span className="font-black text-red-600 text-lg">₺{reportData.totals.expense.toLocaleString()}</span>
                     </div>
                 </div>
             </div>
          </div>
        );
      case 'profitability':
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChartCard title="Ürün Bazlı Net Kâr Dağılımı" icon={<TrendingUp size={18}/>}>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={reportData.profitability.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: chartTheme.text}} height={60} interval={0} angle={-25} textAnchor="end" stroke={chartTheme.grid} />
                                <YAxis tick={{fontSize: 10, fill: chartTheme.text}} />
                                <Tooltip {...commonTooltip} formatter={(value: number) => `₺${value.toLocaleString()}`} />
                                <Bar dataKey="netProfit" name="Net Kâr" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
                                <TrendingUp size={32} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-400 uppercase">Seçili Dönem Toplam Kâr</h4>
                                <p className="text-4xl font-black text-green-600">₺{reportData.totals.netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl flex items-start gap-3">
                            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                                <b>Hesaplama Formülü:</b> Net Satış Matrahı - (Ürün Maliyeti_Matrah + Kargo_Matrah + PazarYeri_Matrah). <br/>
                                <span className="opacity-70 italic font-bold">*İade edilen ürünlerin ciro ve maliyet etkileri düşürülmüştür.</span>
                            </p>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">KDV Analizi (Tahmini)</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Satışlardan Oluşan KDV:</span>
                                    <span className="font-bold text-green-600">₺{reportData.totals.salesVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Komisyon KDV (İndirilecek):</span>
                                    <span className="font-bold text-red-500">-₺{reportData.totals.commissionVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Kargo KDV (İndirilecek):</span>
                                    <span className="font-bold text-red-500">-₺{reportData.totals.shippingVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-50 dark:border-gray-700 flex justify-between text-base font-black">
                                    <span className="text-gray-800 dark:text-white">Devlete Ödenecek KDV:</span>
                                    <span className="text-blue-600">₺{(reportData.totals.salesVat - reportData.totals.commissionVat - reportData.totals.shippingVat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 font-bold flex items-center gap-2">
                        <LayoutGrid size={18} className="text-blue-500" /> Ürün Karlılık Detay Listesi (Matrah Bazlı)
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Ürün Adı</th>
                                    <th className="px-6 py-4 text-center">Net Satılan</th>
                                    <th className="px-6 py-4 text-right">Net Ciro (₺)</th>
                                    <th className="px-6 py-4 text-right">Net Maliyet (₺)</th>
                                    <th className="px-6 py-4 text-right">Net Kâr (₺)</th>
                                    <th className="px-6 py-4 text-center">Marj</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {reportData.profitability.map((item: any, idx: number) => {
                                    const margin = (item.netProfit / (item.total || 1)) * 100;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">{item.name}</td>
                                            <td className="px-6 py-4 text-center font-medium">x{item.qty}</td>
                                            <td className="px-6 py-4 text-right text-blue-600 font-medium">₺{item.total.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-gray-500">₺{item.totalCost.toLocaleString()}</td>
                                            <td className={`px-6 py-4 text-right font-black ${item.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₺{item.netProfit.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${margin >= 20 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    %{margin.toFixed(0)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
      case 'revenue':
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Ürün Bazlı Ciro" icon={<DollarSign size={18}/>}>
              <ResponsiveContainer width="100%" height={350}><BarChart data={reportData.revenue}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} /><XAxis dataKey="name" tick={{fontSize: 10, fill: chartTheme.text}} height={60} interval={0} angle={-25} textAnchor="end" stroke={chartTheme.grid} /><YAxis tick={{fontSize: 10, fill: chartTheme.text}} stroke={chartTheme.grid} /><Tooltip {...commonTooltip} /><Bar dataKey="total" name="Ciro" fill="#3B82F6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Ciro Dağılımı" icon={<PieChartIcon size={18}/>}>
              <ResponsiveContainer width="100%" height={350}><PieChart><Pie data={reportData.revenue} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={120} label stroke={chartTheme.tooltipBg}>{reportData.revenue.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip {...commonTooltip} /></PieChart></ResponsiveContainer>
            </ChartCard>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div><h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><BarChart3 className="text-blue-600" /> Analitik Rapor Paneli</h1><p className="text-sm text-gray-500 mt-1">İşletme performansınızı derinlemesine analiz edin.</p></div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value as ReportType)} className="w-full lg:w-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white text-sm rounded-xl px-4 py-2.5 outline-none font-medium">
                <option value="profitability">📈 Ürün Kârlılık Analizi (Net)</option>
                <option value="revenue">💰 Ciro Getiren Ürünler</option>
                <option value="returns">🔄 İade ve Fire Raporu</option>
                <option value="ad_performance">📢 Reklam Performansı (ROAS)</option>
                <option value="customer_loyalty">💎 Daimi Müşteri Analizi</option>
                <option value="expenses">💸 Gider Kategorileri</option>
            </select>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                <Calendar size={18} className="text-blue-500" /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none w-32 dark:text-white" /><span className="text-gray-400">-</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none w-32 dark:text-white" />
            </div>
            <button onClick={() => window.print()} className="p-3 bg-white dark:bg-gray-700 text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-100 transition shadow-sm"><Printer size={20} /></button>
          </div>
        </div>
      </div>
      {renderActiveReport()}
    </div>
  );
};

const ChartCard = ({ title, children, icon }: any) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm min-h-[400px] flex flex-col">
    <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 pb-3 shrink-0">{icon} {title}</h3>
    <div className="flex-1 w-full">{children}</div>
  </div>
);

const StatMini = ({ title, value, icon, color, bg }: any) => (
    <div className={`${bg} dark:bg-gray-800 p-4 rounded-2xl border border-white/50 dark:border-gray-700 shadow-sm flex items-center gap-4`}>
        <div className={`p-2 rounded-lg bg-white/80 dark:bg-gray-700 ${color}`}>{icon}</div>
        <div><p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{title}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div>
    </div>
);

export default Reports;
