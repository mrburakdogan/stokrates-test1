
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Wallet, X, CheckSquare, Square, DollarSign, Edit2, Calendar, Scale, ArrowUpDown, Filter, Building2, Gavel, CheckCircle2, Clock, Landmark, ArrowDownLeft, ArrowUpRight, AlertTriangle, TrendingUp, TrendingDown, Calculator, ChevronRight } from 'lucide-react';
import { DebtCredit } from '../types';
import { deleteDebtCredit, generateId, getDebtCredits, saveDebtCredit } from '../services/db';

const DebtCreditTracking: React.FC = () => {
  const [items, setItems] = useState<DebtCredit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'debt' | 'credit'>('debt');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Date Filter State (Default: This Month)
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    type: 'debt' as 'debt' | 'credit',
    isCompleted: false,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setItems(getDebtCredits());
  };

  const setQuickDateFilter = (type: 'today' | 'week' | 'month' | 'next_month' | 'all') => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (type) {
      case 'today':
        start = end = now.toISOString().split('T')[0];
        break;
      case 'week':
        const day = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - day + 1);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        start = monday.toISOString().split('T')[0];
        end = sunday.toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'next_month':
        start = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];
        break;
      case 'all':
        start = '2000-01-01';
        end = '2100-12-31';
        break;
    }
    setStartDate(start);
    setEndDate(end);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: DebtCredit = {
      id: editingId || generateId(),
      title: formData.title,
      amount: parseFloat(formData.amount) || 0,
      dueDate: formData.dueDate,
      type: formData.type,
      isCompleted: formData.isCompleted,
      description: formData.description
    };

    saveDebtCredit(newItem);
    loadData();
    handleCloseModal();
  };

  const handleEdit = (item: DebtCredit) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      amount: item.amount.toString(),
      dueDate: item.dueDate,
      type: item.type,
      isCompleted: item.isCompleted,
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      deleteDebtCredit(id);
      loadData();
    }
  };

  const toggleStatus = (item: DebtCredit) => {
      const updated = { ...item, isCompleted: !item.isCompleted };
      saveDebtCredit(updated);
      loadData();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      title: '',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      type: activeTab,
      isCompleted: false,
      description: ''
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtering Logic
  const filteredItems = items.filter(i => {
    const matchesTab = i.type === activeTab;
    const matchesSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = i.dueDate >= startDate && i.dueDate <= endDate;
    return matchesTab && matchesSearch && matchesDate;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Statistics based on CURRENT DATE FILTER
  const totalPendingDebt = items
    .filter(i => i.type === 'debt' && !i.isCompleted && i.dueDate >= startDate && i.dueDate <= endDate)
    .reduce((sum, curr) => sum + curr.amount, 0);
    
  const totalPendingCredit = items
    .filter(i => i.type === 'credit' && !i.isCompleted && i.dueDate >= startDate && i.dueDate <= endDate)
    .reduce((sum, curr) => sum + curr.amount, 0);

  const netBalance = totalPendingCredit - totalPendingDebt;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Landmark className="text-indigo-600" /> Borç & Alacak Takibi
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ödeme takvimini ve gelecek tahsilatları yönetin.</p>
        </div>
        <button 
            onClick={() => {
                setFormData(prev => ({ ...prev, type: activeTab }));
                setIsModalOpen(true);
            }}
            className={`text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg dark:shadow-none font-bold ${activeTab === 'debt' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
            <Plus size={20} />
            <span>{activeTab === 'debt' ? 'Yeni Borç Ekle' : 'Yeni Alacak Ekle'}</span>
        </button>
      </div>

      {/* --- DATE FILTER BAR --- */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              <Calendar size={18} className="text-blue-600" />
              Tarih Aralığı:
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 w-full sm:w-auto">
              <input 
                  type="date" 
                  className="bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 w-full sm:w-32 cursor-pointer"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-gray-400">-</span>
              <input 
                  type="date" 
                  className="bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 w-full sm:w-32 cursor-pointer"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
              />
          </div>

          <div className="flex flex-wrap gap-1.5 ml-0 xl:ml-2">
              <button onClick={() => setQuickDateFilter('today')} className="px-3 py-1.5 text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-blue-600 hover:text-white transition-all">Bugün</button>
              <button onClick={() => setQuickDateFilter('week')} className="px-3 py-1.5 text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-blue-600 hover:text-white transition-all">Bu Hafta</button>
              <button onClick={() => setQuickDateFilter('month')} className="px-3 py-1.5 text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800">Bu Ay</button>
              <button onClick={() => setQuickDateFilter('next_month')} className="px-3 py-1.5 text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-blue-600 hover:text-white transition-all">Gelecek Ay</button>
              <button onClick={() => setQuickDateFilter('all')} className="px-3 py-1.5 text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-blue-600 hover:text-white transition-all">Tümü</button>
          </div>
      </div>

      {/* --- GENERAL CASH FLOW SUMMARY (DATE SENSITIVE) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Credit Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-green-100 dark:border-green-900/30 flex items-center gap-4 relative overflow-hidden group transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ArrowUpRight size={80} className="text-green-600" />
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
                  <ArrowUpRight size={28} />
              </div>
              <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Dönem Alacakları</p>
                  <p className="text-3xl font-black text-green-600">₺{totalPendingCredit.toLocaleString('tr-TR')}</p>
              </div>
          </div>

          {/* Total Debt Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-red-100 dark:border-red-900/30 flex items-center gap-4 relative overflow-hidden group transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ArrowDownLeft size={80} className="text-red-600" />
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl">
                  <ArrowDownLeft size={28} />
              </div>
              <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Dönem Borçları</p>
                  <p className="text-3xl font-black text-red-600">₺{totalPendingDebt.toLocaleString('tr-TR')}</p>
              </div>
          </div>

          {/* Net Status Card */}
          <div className={`p-6 rounded-3xl shadow-lg flex items-center gap-4 relative overflow-hidden group transition-all ${netBalance >= 0 ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'}`}>
              <div className="absolute top-0 right-0 p-2 opacity-20">
                  <Calculator size={80} />
              </div>
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
                  {netBalance >= 0 ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
              </div>
              <div>
                  <p className="text-xs font-black opacity-70 uppercase tracking-widest">Dönem Net Bakiye</p>
                  <p className="text-3xl font-black">
                      {netBalance > 0 ? '+' : ''}₺{netBalance.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-tighter">
                      {netBalance >= 0 ? 'Bu dönem artıdasınız' : 'Bu dönem eksidesiniz'}
                  </p>
              </div>
          </div>
      </div>

      <div className="pt-4 flex flex-col md:flex-row gap-4 items-center">
        {/* Tabs */}
        <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm w-full md:w-auto">
            <button 
                onClick={() => setActiveTab('debt')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'debt' ? 'bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
                <ArrowDownLeft size={18} /> Borçlarım
            </button>
            <button 
                onClick={() => setActiveTab('credit')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'credit' ? 'bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-none' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
                <ArrowUpRight size={18} /> Alacaklarım
            </button>
        </div>

        <div className="flex-1 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center w-full">
            <Search className="text-gray-400 mx-3" size={20}/>
            <input 
                type="text" 
                placeholder="Listede ara..." 
                className="bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 w-full font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Vade Tarihi</th>
                <th className="px-6 py-4">Açıklama / Başlık</th>
                <th className="px-6 py-4">Tutar</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isOverdue = !item.isCompleted && item.dueDate < todayStr;
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isOverdue ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-2 font-mono font-bold text-sm ${isOverdue ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                            <Calendar size={14} />
                            {new Date(item.dueDate).toLocaleDateString('tr-TR')}
                            {isOverdue && <AlertTriangle size={14} className="animate-pulse" />}
                        </div>
                        {isOverdue && <span className="text-[10px] text-red-500 font-bold uppercase">Gecikmiş</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 dark:text-gray-200">{item.title}</div>
                        {item.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1 italic">{item.description}</div>}
                      </td>
                      <td className={`px-6 py-4 font-black text-lg ${activeTab === 'debt' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                          ₺{item.amount.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                            onClick={() => toggleStatus(item)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                                item.isCompleted 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700 border border-orange-200'
                            }`}
                        >
                            {item.isCompleted ? <CheckCircle2 size={14}/> : <Clock size={14}/>}
                            {item.isCompleted ? (activeTab === 'debt' ? 'ÖDENDİ' : 'ALINDI') : 'BEKLİYOR'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Edit2 size={18} /></button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                        <Scale className="text-gray-200 mb-2" size={48} />
                        <p className="text-lg font-medium">Bu kriterlerde veya tarih aralığında kayıt bulunamadı.</p>
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
            <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center ${formData.type === 'debt' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                {formData.type === 'debt' ? <ArrowDownLeft className="text-red-600"/> : <ArrowUpRight className="text-green-600"/>}
                {editingId ? 'Kaydı Güncelle' : (formData.type === 'debt' ? 'Yeni Borç Kaydı' : 'Yeni Alacak Kaydı')}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Açıklama / Başlık</label>
                <input
                  type="text"
                  required
                  placeholder={formData.type === 'debt' ? "Örn: Dükkan Kirası" : "Örn: Ahmet Bey'den gelecek ödeme"}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Tutar (₺)</label>
                    <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 outline-none"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Vade Tarihi</label>
                    <input
                      type="date"
                      required
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 outline-none"
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Notlar (Opsiyonel)</label>
                <textarea 
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 outline-none h-20 resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className={`p-4 rounded-2xl flex items-center justify-between border ${formData.isCompleted ? 'bg-green-50 border-green-100 dark:bg-green-900/20' : 'bg-gray-50 border-gray-100 dark:bg-gray-900/20'}`}>
                  <div className="flex items-center gap-3">
                      {formData.isCompleted ? <CheckCircle2 className="text-green-500" /> : <Clock className="text-gray-400" />}
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">İşlem Tamamlandı mı?</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, isCompleted: !formData.isCompleted})}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${formData.isCompleted ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-500 border border-gray-200'}`}
                  >
                      {formData.isCompleted ? 'EVET' : 'HAYIR'}
                  </button>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 text-gray-500 font-bold">İptal</button>
                <button type="submit" className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all ${formData.type === 'debt' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
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

export default DebtCreditTracking;
