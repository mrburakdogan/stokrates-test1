
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Wallet, X, CheckSquare, Square, BarChart3, TrendingUp, MousePointer2, Eye, DollarSign, Megaphone, Edit2, Calendar, Scale, ArrowUpDown, Filter, Building2, Gavel, CheckCircle2, Clock } from 'lucide-react';
import { Expense } from '../types';
import { deleteExpense, generateId, getExpenses, saveExpense } from '../services/db';

const TAX_TYPES = [
    "KDV (Katma Değer Vergisi)",
    "Muhtasar Vergisi",
    "Geçici Vergi",
    "Gelir Vergisi",
    "Kurumlar Vergisi",
    "Damga Vergisi",
    "SGK Prim Ödemesi",
    "Bağ-Kur Ödemesi",
    "MTV (Motorlu Taşıtlar Vergisi)",
    "Emlak Vergisi",
    "Belediye Vergisi / Harç",
    "ÖTV (Özel Tüketim Vergisi)",
    "Stopaj Ödemesi"
];

const GENERAL_CATEGORIES = [
    "Kargo", "Esans", "Muhasebe", "Komisyon", "Hizmet Bedeli", "Şişe", "Kimyasal", 
    "Tanıtım/Baskı", "Kira", "Fatura", "Personel", "Vergi", "Yemek", "Ulaşım", "Ofis Malzemesi"
];

type SortKey = 'title' | 'category' | 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'ads' | 'taxes'>('general');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });

  // Filter State
  const [taxFilter, setTaxFilter] = useState('all');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    amount: '',
    vatRate: '20',
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    isAd: false,
    isTax: false,
    isPaid: false, // Form state update
    platform: 'Meta (Instagram/FB)',
    impressions: '',
    clicks: '',
    adRevenue: ''
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = () => {
    setExpenses(getExpenses());
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    const filtered = filteredExpenses.map(e => e.id);
    if (selectedIds.size === filtered.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filtered));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`${selectedIds.size} adet kaydı silmek istediğinize emin misiniz?`)) {
        selectedIds.forEach(id => deleteExpense(id));
        setExpenses(prev => prev.filter(e => !selectedIds.has(e.id)));
        setSelectedIds(new Set());
        setTimeout(() => loadExpenses(), 50);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    const vatRate = parseInt(formData.vatRate);
    
    let vatAmount = 0;
    if (vatRate === 100) {
        vatAmount = amount;
    } else {
        vatAmount = amount - (amount / (1 + vatRate / 100));
    }

    const newExpense: Expense = {
      id: editingId || generateId(),
      title: formData.title,
      category: formData.isAd ? 'Reklam' : (formData.isTax ? formData.category : formData.category),
      amount: amount,
      vatRate: formData.isTax ? 0 : vatRate,
      vatAmount: formData.isTax ? 0 : vatAmount,
      date: formData.date,
      endDate: formData.isAd ? (formData.endDate || undefined) : undefined,
      isAd: formData.isAd,
      isTax: formData.isTax,
      isPaid: formData.isTax ? formData.isPaid : true, // Taxes can be unpaid, general expenses default to paid
      platform: formData.isAd ? formData.platform : undefined,
      impressions: formData.isAd ? (parseInt(formData.impressions) || 0) : undefined,
      clicks: formData.isAd ? (parseInt(formData.clicks) || 0) : undefined,
      adRevenue: formData.isAd ? (parseFloat(formData.adRevenue) || 0) : undefined,
    };

    saveExpense(newExpense);
    loadExpenses();
    handleCloseModal();
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      title: expense.title,
      category: expense.category,
      amount: expense.amount.toString(),
      vatRate: expense.vatRate.toString(),
      date: expense.date,
      endDate: expense.endDate || '',
      isAd: expense.isAd || false,
      isTax: expense.isTax || false,
      isPaid: expense.isPaid || false,
      platform: expense.platform || 'Meta (Instagram/FB)',
      impressions: expense.impressions?.toString() || '',
      clicks: expense.clicks?.toString() || '',
      adRevenue: expense.adRevenue?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      deleteExpense(id);
      loadExpenses();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ 
      title: '', 
      category: '', 
      amount: '', 
      vatRate: '20',
      date: new Date().toISOString().split('T')[0],
      endDate: '',
      isAd: activeTab === 'ads',
      isTax: activeTab === 'taxes',
      isPaid: false,
      platform: 'Meta (Instagram/FB)',
      impressions: '',
      clicks: '',
      adRevenue: ''
    });
  };

  const openModalWithContext = (type: 'ad' | 'tax' | 'general') => {
      setEditingId(null);
      setFormData(prev => ({ 
          ...prev, 
          isAd: type === 'ad', 
          isTax: type === 'tax',
          isPaid: type !== 'tax', // Default tax is unpaid, others are paid
          category: type === 'tax' ? TAX_TYPES[0] : (type === 'general' ? 'Muhasebe' : ''),
          date: new Date().toISOString().split('T')[0], 
          endDate: '' 
      }));
      setIsModalOpen(true);
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesTab = activeTab === 'ads' ? e.isAd : (activeTab === 'taxes' ? e.isTax : (!e.isAd && !e.isTax));
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (e.category && e.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTaxFilter = activeTab === 'taxes' && taxFilter !== 'all' ? e.category === taxFilter : true;
    
    return matchesTab && matchesSearch && matchesTaxFilter;
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let valA: any = a[sortConfig.key];
    let valB: any = b[sortConfig.key];

    if (sortConfig.key === 'amount') {
      valA = a.amount;
      valB = b.amount;
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: SortKey, className?: string }) => (
    <th 
        className={`px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group ${className}`}
        onClick={() => handleSort(sortKey)}
    >
        <div className="flex items-center gap-1">
            {label}
            <ArrowUpDown size={14} className={`text-gray-400 group-hover:text-blue-500 transition-colors ${sortConfig.key === sortKey ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
        </div>
    </th>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Wallet className="text-red-500" /> Gider & Harcama Yönetimi
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">İşletme masraflarını, reklam bütçelerini ve vergileri takip edin.</p>
        </div>
        <div className="flex gap-2">
            {selectedIds.size > 0 && (
                <button 
                    onClick={handleDeleteSelected}
                    className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-bold text-sm"
                >
                    <Trash2 size={18} />
                    <span>Seçilenleri Sil ({selectedIds.size})</span>
                </button>
            )}
            <button 
                onClick={() => openModalWithContext(activeTab === 'ads' ? 'ad' : (activeTab === 'taxes' ? 'tax' : 'general'))}
                className={`text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg dark:shadow-none font-bold ${
                    activeTab === 'ads' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 
                    activeTab === 'taxes' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 
                    'bg-red-600 hover:bg-red-700 shadow-red-200'
                }`}
            >
                <Plus size={20} />
                <span>{activeTab === 'ads' ? 'Yeni Reklam Harcaması' : (activeTab === 'taxes' ? 'Vergi Ödemesi Ekle' : 'Yeni Gider Ekle')}</span>
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'general' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Wallet size={18} /> Genel Giderler
          </button>
          <button 
            onClick={() => setActiveTab('ads')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'ads' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Megaphone size={18} /> Reklam Harcamaları
          </button>
          <button 
            onClick={() => setActiveTab('taxes')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'taxes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Scale size={18} /> Vergi Takibi
          </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Gider başlığı, kampanya veya vergi ara..." 
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 text-gray-700 dark:text-gray-200 w-full outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {activeTab === 'taxes' && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter size={18} className="text-gray-400" />
                    <select 
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none"
                        value={taxFilter}
                        onChange={(e) => setTaxFilter(e.target.value)}
                    >
                        <option value="all">Tüm Vergi Türleri</option>
                        {TAX_TYPES.map(tax => <option key={tax} value={tax}>{tax}</option>)}
                    </select>
                </div>
            )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="w-10 pl-6 pr-0 py-3">
                    <button onClick={handleSelectAll} className="p-1 rounded hover:bg-gray-200 transition-colors">
                        {selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0 ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16}/>}
                    </button>
                </th>
                <SortHeader label={activeTab === 'ads' ? 'Kampanya / Başlık' : 'Gider Kalemi / Başlık'} sortKey="title" />
                <SortHeader label={activeTab === 'ads' ? 'Platform' : 'Cinsi'} sortKey="category" />
                <SortHeader label="Tarih" sortKey="date" />
                {activeTab === 'ads' && (
                    <>
                        <th className="px-6 py-3 text-center">Analiz (ROAS)</th>
                        <th className="px-6 py-3 text-center">Etkileşim</th>
                    </>
                )}
                {activeTab === 'taxes' && <th className="px-6 py-3">Ödeme Durumu</th>}
                <SortHeader label="Toplam Tutar" sortKey="amount" />
                <th className="px-6 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedExpenses.length > 0 ? (
                sortedExpenses.map((expense) => {
                  const roas = (expense.adRevenue || 0) / (expense.amount || 1);
                  return (
                    <tr key={expense.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedIds.has(expense.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <td className="w-10 pl-6 pr-0 py-4">
                          <button onClick={() => handleToggleSelect(expense.id)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                              {selectedIds.has(expense.id) ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16}/>}
                          </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 dark:text-gray-200">{expense.title}</div>
                        {expense.isAd && (
                          <div className="flex items-center gap-1 text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase mt-0.5">
                            <Calendar size={10}/>
                            {new Date(expense.date).toLocaleDateString('tr-TR')}
                            {expense.endDate && ` - ${new Date(expense.endDate).toLocaleDateString('tr-TR')}`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-tight ${
                              expense.isAd ? 'bg-purple-100 text-purple-800' : 
                              expense.isTax ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                              {expense.isAd ? expense.platform : expense.category}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
                        {new Date(expense.date).toLocaleDateString('tr-TR')}
                      </td>
                      {expense.isAd && (
                          <>
                              <td className="px-6 py-4 text-center">
                                  <div className={`text-xs font-bold ${roas >= 4 ? 'text-green-600' : 'text-orange-600'}`}>
                                      {roas.toFixed(2)}x ROAS
                                  </div>
                                  <div className="text-[10px] text-gray-400">Getiri: ₺{expense.adRevenue?.toLocaleString()}</div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col gap-0.5 text-[10px] text-gray-500">
                                      <span className="flex items-center justify-center gap-1"><Eye size={10}/> {expense.impressions?.toLocaleString()}</span>
                                      <span className="flex items-center justify-center gap-1 font-bold text-gray-700 dark:text-gray-300"><MousePointer2 size={10}/> {expense.clicks?.toLocaleString()}</span>
                                  </div>
                              </td>
                          </>
                      )}
                      {activeTab === 'taxes' && (
                        <td className="px-6 py-4">
                            {expense.isPaid ? (
                                <span className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full uppercase">
                                    <CheckCircle2 size={12} /> Ödendi
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full uppercase">
                                    <Clock size={12} /> Bekliyor
                                </span>
                            )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-gray-800 dark:text-white font-bold whitespace-nowrap">₺{expense.amount.toLocaleString('tr-TR')}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(expense)} 
                            className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handleDelete(e, expense.id)} 
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={activeTab === 'ads' ? 8 : (activeTab === 'taxes' ? 8 : 7)} className="px-6 py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                        <Wallet className="text-gray-200 mb-2" size={48} />
                        <p className="text-lg font-medium">Bu kategoride henüz kayıt bulunamadı.</p>
                        <p className="text-sm">Yeni bir harcama veya ödeme ekleyerek başlayın.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
            <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center ${
                formData.isAd ? 'bg-purple-50 dark:bg-purple-900/20' : 
                formData.isTax ? 'bg-blue-50 dark:bg-blue-900/20' : 
                'bg-red-50 dark:bg-red-900/20'
            }`}>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {formData.isAd ? <Megaphone className="text-purple-600"/> : (formData.isTax ? <Scale className="text-blue-600"/> : <Wallet className="text-red-600"/>)}
                {editingId ? 'Kaydı Güncelle' : (formData.isAd ? 'Reklam Analizi Ekle' : (formData.isTax ? 'Vergi Ödemesi Ekle' : 'Yeni Gider Ekle'))}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                    {formData.isAd ? 'Kampanya Adı / Başlık' : (formData.isTax ? 'Ödeme Açıklaması' : 'Gider Kalemi (Açıklama)')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={formData.isAd ? "Örn: Haziran İndirimi Reklamı" : (formData.isTax ? "Örn: 2024 Mart Dönemi KDV" : "Örn: Dükkan Kirası")}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              {formData.isAd && (
                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl space-y-4 border border-purple-100 dark:border-purple-800">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 uppercase mb-1">Platform</label>
                            <select 
                                className="w-full border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700"
                                value={formData.platform}
                                onChange={e => setFormData({...formData, platform: e.target.value})}
                            >
                                <option>Meta (Instagram/FB)</option>
                                <option>Google Ads</option>
                                <option>Trendyol Reklam</option>
                                <option>TikTok</option>
                                <option>Diğer</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 uppercase mb-1">Reklam Cirosu (₺)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700"
                                value={formData.adRevenue}
                                onChange={e => setFormData({...formData, adRevenue: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 uppercase mb-1 flex items-center gap-1"><Eye size={12}/> Gösterim</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700"
                                value={formData.impressions}
                                onChange={e => setFormData({...formData, impressions: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 uppercase mb-1 flex items-center gap-1"><MousePointer2 size={12}/> Tıklama</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700"
                                value={formData.clicks}
                                onChange={e => setFormData({...formData, clicks: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                        {formData.isAd ? 'Reklam Bütçesi' : (formData.isTax ? 'Ödeme Tutarı' : 'Tutar (KDV Dahil)')}
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400">₺</span>
                        <input
                            type="number"
                            step="0.01"
                            required
                            min="0"
                            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl pl-7 pr-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                            value={formData.amount}
                            onChange={e => setFormData({...formData, amount: e.target.value})}
                        />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">KDV Oranı</label>
                    <select
                        disabled={formData.isTax}
                        className={`w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none ${formData.isTax ? 'opacity-50' : ''}`}
                        value={formData.isTax ? '0' : formData.vatRate}
                        onChange={e => setFormData({...formData, vatRate: e.target.value})}
                    >
                        <option value="0">%0</option>
                        <option value="1">%1</option>
                        <option value="10">%10</option>
                        <option value="20">%20</option>
                        <option value="100">%100 (Tümü KDV)</option>
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{formData.isAd ? 'Başlangıç Tarihi' : (formData.isTax ? 'Son Ödeme Tarihi' : 'Gider Tarihi')}</label>
                    <input
                      type="date"
                      required
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                </div>
                {formData.isAd ? (
                   <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Bitiş Tarihi (Opsiyonel)</label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                      value={formData.endDate}
                      onChange={e => setFormData({...formData, endDate: e.target.value})}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">{formData.isTax ? 'Vergi Türü' : 'Gider Kategorisi'}</label>
                    {formData.isTax ? (
                        <select 
                            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                            {TAX_TYPES.map(tax => <option key={tax} value={tax}>{tax}</option>)}
                        </select>
                    ) : (
                        <select
                            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                            <option value="">Kategori Seçin</option>
                            {GENERAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    )}
                  </div>
                )}
              </div>

              {/* Paid Status Box for Taxes */}
              {formData.isTax && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <CheckCircle2 className={formData.isPaid ? 'text-green-500' : 'text-gray-300'} size={24} />
                          <div>
                              <p className="text-sm font-bold text-blue-900 dark:text-blue-200">Vergi Ödeme Durumu</p>
                              <p className="text-[10px] text-blue-600 dark:text-blue-400">Ödenen vergiler hatırlatıcı listesinden çıkarılır.</p>
                          </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, isPaid: !formData.isPaid})}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm ${formData.isPaid ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-500 border border-gray-200 dark:border-gray-600'}`}
                      >
                          {formData.isPaid ? 'ÖDENDİ' : 'ÖDEME YAPILDI MI?'}
                      </button>
                  </div>
              )}

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 text-gray-500 font-medium">İptal</button>
                <button type="submit" className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-lg transition ${
                    formData.isAd ? 'bg-purple-600 hover:bg-purple-700' : 
                    formData.isTax ? 'bg-blue-600 hover:bg-blue-700' : 
                    'bg-red-600 hover:bg-red-700'
                }`}>
                  {editingId ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
