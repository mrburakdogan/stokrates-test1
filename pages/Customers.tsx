import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Edit2, Search, MapPin, Phone, Award, ChevronRight, X, Download, Upload, CheckSquare, Square, ListOrdered, Star } from 'lucide-react';
import { Customer, Sale } from '../types';
import { deleteCustomer, generateId, getCustomers, getSales, saveCustomer } from '../services/db';
import { useNavigate } from 'react-router-dom';
import { exportToExcel, importFromExcel } from '../services/excel';

const COUNTRY_CODES = [
  { code: '+90', country: 'TR', flag: '🇹🇷' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+994', country: 'AZ', flag: '🇦🇿' },
];

type SortType = 'newest' | 'oldest' | 'order_asc' | 'order_desc' | 'name_asc' | 'name_desc';
type FilterType = 'all' | 'loyal' | 'reviewer';

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortType>('newest');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState('+90');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    hasReview: false,
    gender: '' as 'male' | 'female' | ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCustomers(getCustomers());
    setSales(getSales());
  };

  const getCustomerSaleCount = (customerId: string) => {
    return sales.filter(s => s.customerId === customerId && s.status !== 'cancelled').length;
  };

  const isLoyal = (customerId: string) => getCustomerSaleCount(customerId) >= 3;

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`${selectedIds.size} adet müşteriyi silmek istediğinize emin misiniz?`)) {
        selectedIds.forEach(id => deleteCustomer(id));
        loadData();
        setSelectedIds(new Set());
    }
  };

  const handleExport = () => {
      const exportData = customers.map(c => ({
          "Müşteri Adı": c.name,
          "Telefon": c.phone,
          "Adres": c.address,
          "Yorum Yaptı mı?": c.hasReview ? "Evet" : "Hayır",
          "İşlem Sayısı": getCustomerSaleCount(c.id),
          "Daimi Müşteri": isLoyal(c.id) ? "Evet" : "Hayır"
      }));
      exportToExcel(exportData, "musteri_listesi");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const data = await importFromExcel(file);
          let count = 0;
          data.forEach((row: any) => {
              const name = row["Müşteri Adı"] || row["name"] || row["Name"];
              if (name) {
                  saveCustomer({
                      id: generateId(),
                      name: String(name),
                      phone: String(row["Telefon"] || row["phone"] || ""),
                      address: String(row["Adres"] || row["address"] || ""),
                      hasReview: row["Yorum Yaptı mı?"] === "Evet" || row["hasReview"] === true
                  });
                  count++;
              }
          });
          alert(`${count} müşteri başarıyla içe aktarıldı.`);
          loadData();
      } catch (err) {
          alert("Excel okuma hatası. Lütfen dosya formatını kontrol edin.");
      } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
    const cleanNumber = phoneNumber.replace(/^0+/, '');
    const fullPhone = phoneNumber ? `${phoneCode}${cleanNumber}` : '';

    const newCustomer: Customer = {
      id: editingId || generateId(),
      name: fullName,
      phone: fullPhone,
      address: formData.address,
      hasReview: formData.hasReview,
      gender: formData.gender || undefined
    };

    saveCustomer(newCustomer);
    loadData();
    handleCloseModal();
  };

  const handleEdit = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault(); e.stopPropagation();
    setEditingId(customer.id);
    
    // Parse phone
    let code = '+90';
    let number = customer.phone || '';
    for (const c of COUNTRY_CODES) {
      if (number.startsWith(c.code)) {
        code = c.code;
        number = number.slice(c.code.length);
        break;
      }
    }
    setPhoneCode(code);
    setPhoneNumber(number);

    const nameParts = customer.name.trim().split(' ');
    setFormData({
      firstName: nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : customer.name,
      lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
      address: customer.address || '',
      hasReview: customer.hasReview || false,
      gender: customer.gender || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) {
      deleteCustomer(id);
      loadData();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); setEditingId(null);
    setFormData({ firstName: '', lastName: '', address: '', hasReview: false, gender: '' });
    setPhoneNumber('');
    setPhoneCode('+90');
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm));
    if (!matchesSearch) return false;
    
    if (filterType === 'loyal') return isLoyal(c.id);
    if (filterType === 'reviewer') return c.hasReview === true;
    return true;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const countA = getCustomerSaleCount(a.id);
    const countB = getCustomerSaleCount(b.id);
    
    switch (sortOrder) {
        case 'newest': return -1;
        case 'oldest': return 1;
        case 'order_asc': return countA - countB;
        case 'order_desc': return countB - countA;
        case 'name_asc': return a.name.localeCompare(b.name, 'tr');
        case 'name_desc': return b.name.localeCompare(a.name, 'tr');
        default: return 0;
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Müşteri Cari Listesi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Toplam {customers.length} kayıtlı müşteri.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            {selectedIds.size > 0 && (
                <button onClick={handleDeleteSelected} className="bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400 hover:bg-red-100 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-bold text-sm">
                    <Trash2 size={18} /> <span>Seçilenleri Sil ({selectedIds.size})</span>
                </button>
            )}
            
            <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-bold shadow-md shadow-green-100 dark:shadow-none">
              <Download size={18} /> <span className="hidden md:inline">Excel İndir</span>
            </button>
            
            <button onClick={() => fileInputRef.current?.click()} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-bold shadow-md shadow-orange-100 dark:shadow-none">
              <Upload size={18} /> <span className="hidden md:inline">Excel Yükle</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />

            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none font-bold">
              <Plus size={20} /> <span className="hidden sm:inline">Yeni Müşteri</span>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex items-center flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Search className="text-gray-400 mr-2" size={20}/>
                    <input 
                        type="text" 
                        placeholder="Müşteri adı veya telefon numarası ile ara..." 
                        className="bg-transparent border-none outline-none text-gray-700 dark:text-white w-full text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 shadow-sm transition-all">
                    <ListOrdered className="text-blue-500" size={18} />
                    <select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value as SortType)}
                        className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-white font-bold cursor-pointer min-w-[180px]"
                    >
                        <option value="newest" className="bg-white dark:bg-gray-800">Yeniden Eskiye</option>
                        <option value="oldest" className="bg-white dark:bg-gray-800">Eskiden Yeniye</option>
                        <option value="order_desc" className="bg-white dark:bg-gray-800">İşlem Sayısı (Çoktan Aza)</option>
                        <option value="order_asc" className="bg-white dark:bg-gray-800">İşlem Sayısı (Azdan Çoğa)</option>
                        <option value="name_asc" className="bg-white dark:bg-gray-800">İsim (A - Z)</option>
                        <option value="name_desc" className="bg-white dark:bg-gray-800">İsim (Z - A)</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">Hızlı Filtre:</span>
                
                <button 
                  onClick={() => setFilterType('all')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${filterType === 'all' ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400'}`}
                >
                  Tümü
                </button>
                
                <button 
                  onClick={() => setFilterType('loyal')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${filterType === 'loyal' ? 'bg-yellow-500 border-yellow-500 text-white shadow-md shadow-yellow-200 dark:shadow-none' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-yellow-600 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'}`}
                >
                  <Award size={14} fill={filterType === 'loyal' ? "currentColor" : "none"} /> Daimi Müşteriler
                </button>
                
                <button 
                  onClick={() => setFilterType('reviewer')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${filterType === 'reviewer' ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-purple-600 text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}
                >
                  <Star size={14} fill={filterType === 'reviewer' ? "currentColor" : "none"} /> Yorum Yapanlar
                </button>

                <div className="ml-auto flex items-center gap-3">
                   <button onClick={handleSelectAll} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                       {selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0 ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                   </button>
                   <span className="text-xs text-gray-400 font-medium">{sortedCustomers.length} Müşteri listelendi</span>
                </div>
            </div>
        </div>
        
        {sortedCustomers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {sortedCustomers.map(customer => {
                    const saleCount = getCustomerSaleCount(customer.id);
                    const isCustomerLoyal = saleCount >= 3;
                    
                    return (
                    <div key={customer.id} onClick={() => navigate(`/customers/${customer.id}`)} className={`group relative border rounded-2xl p-5 hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800 cursor-pointer ${selectedIds.has(customer.id) ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900'}`}>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2 scale-90 group-hover:scale-100">
                            <button onClick={(e) => handleToggleSelect(e, customer.id)} className={`p-2 rounded-xl shadow-sm border transition-colors ${selectedIds.has(customer.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400'}`}>
                                {selectedIds.has(customer.id) ? <CheckSquare size={18}/> : <Square size={18}/>}
                            </button>
                            <button onClick={(e) => handleEdit(e, customer)} className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl hover:bg-blue-100 border border-blue-100 dark:border-blue-800"><Edit2 size={18} /></button>
                            <button onClick={(e) => handleDelete(e, customer.id)} className="text-red-600 bg-red-50 dark:bg-red-900/30 p-2 rounded-xl hover:bg-red-100 border border-red-100 dark:border-red-800"><Trash2 size={18} /></button>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-sm ${isCustomerLoyal ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    {customer.name}
                                    {isCustomerLoyal && <Award size={16} className="text-yellow-500" fill="currentColor" title="Daimi Müşteri" />}
                                    {customer.hasReview && <Star size={16} className="text-purple-500" fill="currentColor" title="Yorum Yapan Müşteri" />}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mt-0.5">
                                    <Phone size={12} /> {customer.phone || 'Telefon Yok'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2.5 mb-4">
                            <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <MapPin size={14} className="mt-0.5 shrink-0 text-gray-300" />
                                <span className="line-clamp-1 italic">{customer.address || 'Adres bilgisi girilmemiş.'}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${saleCount > 0 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-900'}`}>
                                    {saleCount} Başarılı Sipariş
                                </span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-300 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                                <ChevronRight size={18} />
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
                    <Search className="text-gray-200 dark:text-gray-700" size={40} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Sonuç Bulunamadı</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1">Arama kriterlerinize veya seçtiğiniz filtreye uygun müşteri bulunmamaktadır.</p>
                <button onClick={() => {setSearchTerm(''); setFilterType('all');}} className="mt-4 text-blue-600 font-bold hover:underline">Filtreleri Temizle</button>
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 animate-scale-up">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div>
                  <h3 className="text-xl font-black text-gray-800 dark:text-white">{editingId ? 'Müşteri Bilgilerini Güncelle' : 'Yeni Müşteri Oluştur'}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Cari bilgilerini eksiksiz doldurunuz.</p>
              </div>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all">
                  <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Adı</label>
                      <input type="text" placeholder="Örn: Ahmet" required className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Soyadı</label>
                      <input type="text" placeholder="Örn: Yılmaz" required className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Cinsiyet</label>
                  <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, gender: 'male'})}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all font-bold text-sm ${formData.gender === 'male' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100'}`}
                      >
                        Erkek
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, gender: 'female'})}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all font-bold text-sm ${formData.gender === 'female' ? 'bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-200 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100'}`}
                      >
                        Kadın
                      </button>
                  </div>
              </div>
              
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefon Numarası</label>
                  <div className="flex gap-2">
                      <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className="w-24 border border-gray-200 dark:border-gray-600 rounded-xl px-2 py-3 bg-gray-50 dark:bg-gray-700 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10">
                          {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                      <input type="tel" placeholder="5XX XXX XX XX" className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono tracking-widest" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Adres Bilgisi</label>
                  <textarea placeholder="Teslimat veya fatura adresi..." className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white h-24 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <input 
                    type="checkbox" 
                    id="hasReview" 
                    className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-gray-300"
                    checked={formData.hasReview}
                    onChange={e => setFormData({...formData, hasReview: e.target.checked})}
                  />
                  <label htmlFor="hasReview" className="text-sm font-bold text-blue-700 dark:text-blue-300 cursor-pointer select-none">
                      Bu müşteri yorum yaptı / geri bildirimde bulundu.
                  </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">İptal</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95">
                    {editingId ? 'Bilgileri Kaydet' : 'Müşteriyi Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;