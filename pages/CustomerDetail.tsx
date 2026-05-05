import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Award, Calendar, Receipt, ChevronDown, ChevronUp, MessageCircle, ArrowUpDown, Trash2, Hash, Tag, Save, X } from 'lucide-react';
import { Customer, Sale } from '../types';
import { getCustomers, getSales, deleteSale, saveCustomer } from '../services/db';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Accordion state for sales details
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  // Discount Editing State
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [tempDiscountCode, setTempDiscountCode] = useState('');

  useEffect(() => {
    loadData();
  }, [id, navigate]);

  const loadData = () => {
    if (!id) return;

    const allCustomers = getCustomers();
    const foundCustomer = allCustomers.find(c => c.id === id);
    
    if (foundCustomer) {
      setCustomer(foundCustomer);
      setTempDiscountCode(foundCustomer.discountCode || '');
      const allSales = getSales();
      const salesForCustomer = allSales.filter(s => s.customerId === id);
      setCustomerSales(salesForCustomer);
    } else {
      // Customer not found
      navigate('/customers');
    }
  };

  const handleDeleteSale = (e: React.MouseEvent, saleId: string) => {
    e.preventDefault();
    e.stopPropagation(); // CRITICAL: Stop the click from bubbling to the accordion toggle
    
    if (window.confirm('Bu satışı silmek ve iptal etmek istediğinize emin misiniz? Ürün stokları geri yüklenecektir ve bu kayıt veritabanından TAMAMEN silinecektir.')) {
        deleteSale(saleId);
        // Manually update local state to reflect changes immediately
        setCustomerSales(prev => prev.filter(s => s.id !== saleId));
        
        // Also reload data to ensure everything is synced
        setTimeout(() => loadData(), 50);
    }
  };

  const handleSaveDiscount = () => {
      if (!customer) return;
      const updatedCustomer: Customer = {
          ...customer,
          discountCode: tempDiscountCode.trim().toUpperCase()
      };
      saveCustomer(updatedCustomer);
      setCustomer(updatedCustomer);
      setIsEditingDiscount(false);
  };

  if (!customer) return null;

  // Filter active sales for calculation
  const activeSales = customerSales.filter(s => s.status !== 'cancelled');
  const totalSpent = activeSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const isLoyalCustomer = activeSales.length >= 3;

  const sortedSales = [...customerSales].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/customers')} 
          className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Müşteri Detayı</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 flex flex-col items-end">
                {isLoyalCustomer && (
                   <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center shadow-sm mb-1">
                      <Award size={14} className="mr-1" />
                      DAİMİ MÜŞTERİ
                   </div>
                )}
                {customer.hasReview && (
                   <div className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-l-lg flex items-center shadow-sm">
                      <MessageCircle size={14} className="mr-1" />
                      YORUMCU
                   </div>
                )}
            </div>
            
            <div className="flex flex-col items-center text-center mb-6 mt-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4 ${isLoyalCustomer ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-200' : 'bg-blue-500'}`}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{customer.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Müşteri ID: {customer.id}</p>
            </div>

            <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-6">
              <div className="flex items-start space-x-3">
                <Phone className="text-gray-400 mt-1" size={18} />
                <div className="w-full">
                  <p className="text-xs text-gray-400 font-medium uppercase mb-1">Telefon & İletişim</p>
                  <p className="text-gray-800 dark:text-gray-200 font-mono text-lg font-medium">{customer.phone}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="text-gray-400 mt-1" size={18} />
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase">Adres</p>
                  <p className="text-gray-700 dark:text-gray-300">{customer.address || '-'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Tag className="text-gray-400 mt-1" size={18} />
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-400 font-medium uppercase">Özel İndirim Kodu</p>
                      {!isEditingDiscount && (
                          <button 
                            onClick={() => setIsEditingDiscount(true)} 
                            className="text-xs text-blue-600 hover:underline"
                          >
                              {customer.discountCode ? 'Düzenle' : 'Ekle'}
                          </button>
                      )}
                  </div>
                  
                  {isEditingDiscount ? (
                      <div className="flex gap-2 items-center animate-fade-in">
                          <input 
                            type="text" 
                            value={tempDiscountCode}
                            onChange={(e) => setTempDiscountCode(e.target.value.toUpperCase())}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white uppercase font-mono"
                            placeholder="KOD"
                          />
                          <button onClick={handleSaveDiscount} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Kaydet"><Save size={16} /></button>
                          <button onClick={() => { setIsEditingDiscount(false); setTempDiscountCode(customer.discountCode || ''); }} className="text-red-500 hover:bg-red-50 p-1 rounded" title="İptal"><X size={16} /></button>
                      </div>
                  ) : (
                      customer.discountCode ? (
                          <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded text-sm font-mono border border-green-100 dark:border-green-800">
                            {customer.discountCode}
                          </span>
                      ) : (
                          <span className="text-sm text-gray-400 italic">Tanımlı değil</span>
                      )
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Özet İstatistikler</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Aktif İşlem</p>
                    <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{activeSales.length}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Toplam Harcama</p>
                    <p className="text-xl font-bold text-green-800 dark:text-green-300">₺{totalSpent.toLocaleString('tr-TR')}</p>
                </div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Receipt size={20} className="text-gray-500" />
                        <h3 className="font-bold text-gray-800 dark:text-white">İşlem Geçmişi</h3>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">{customerSales.length} Kayıt</span>
                    </div>
                    
                    <button 
                        onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                    >
                        <ArrowUpDown size={14} />
                        {sortOrder === 'newest' ? 'Yeniden Eskiye' : 'Eskiden Yeniye'}
                    </button>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sortedSales.length > 0 ? (
                        sortedSales.map((sale) => (
                            <div key={sale.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                <div 
                                    className="p-4 flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-2 rounded-lg ${sale.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                            <Receipt size={20} />
                                        </div>
                                        <div>
                                            <div className={`font-bold flex items-center ${sale.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {sale.orderNumber ? <span className="mr-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 rounded text-sm">#{sale.orderNumber}</span> : null}
                                                {sale.items?.length || 1} Ürünlü Satış
                                                {sale.status === 'cancelled' && <span className="ml-2 text-xs text-red-500 no-underline font-bold">İPTAL EDİLDİ</span>}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                                <Calendar size={12} className="mr-1" />
                                                {new Date(sale.date).toLocaleDateString('tr-TR')}
                                                {sale.discount > 0 && <span className="ml-2 text-green-600 dark:text-green-400 font-medium">({sale.discount}₺ İndirim)</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="text-right">
                                            <div className={`font-bold ${sale.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                                ₺{sale.totalAmount.toLocaleString('tr-TR')}
                                            </div>
                                            <div className="text-xs text-gray-400">KDV Dahil</div>
                                        </div>
                                        {expandedSale === sale.id ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                                    </div>
                                </div>

                                {expandedSale === sale.id && (
                                    <div className="bg-gray-50 dark:bg-gray-900/30 px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 text-sm">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-xs text-gray-400 text-left">
                                                    <th className="py-2">Ürün</th>
                                                    <th className="py-2 text-center">Adet</th>
                                                    <th className="py-2 text-right">Tutar</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">
                                                {sale.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="py-2 text-gray-700 dark:text-gray-300">{item.productName}</td>
                                                        <td className="py-2 text-center text-gray-600 dark:text-gray-400">x{item.quantity}</td>
                                                        <td className="py-2 text-right text-gray-700 dark:text-gray-300">₺{item.totalPrice.toLocaleString('tr-TR')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="mt-3 text-right text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                                            <p>Ara Toplam: ₺{sale.subTotal.toLocaleString('tr-TR')}</p>
                                            {sale.discount > 0 && <p className="text-green-600 dark:text-green-400">İndirim: -₺{sale.discount.toLocaleString('tr-TR')}</p>}
                                            <p>Toplam KDV: ₺{sale.totalVat.toLocaleString('tr-TR')}</p>
                                        </div>
                                        
                                        {/* DELETE BUTTON SECTION */}
                                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                            <button 
                                                type="button"
                                                onClick={(e) => handleDeleteSale(e, sale.id)}
                                                className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-xs font-bold"
                                            >
                                                <Trash2 size={14} />
                                                Satışı İptal Et ve Sil (Stok İade)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            Henüz işlem kaydı bulunmamaktadır.
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerDetail;