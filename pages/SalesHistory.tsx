
import React, { useEffect, useState, useRef } from 'react';
/* Added Info to lucide-react imports */
import { Search, ArrowUpDown, XCircle, Calendar, Receipt, AlertCircle, Trash2, CheckCircle, Download, Edit2, Upload, CheckSquare, Square, RotateCcw, X, Save, Info } from 'lucide-react';
import { Sale, SaleItem, Customer, Product } from '../types';
import { getSales, cancelSale, deleteSale, saveSale, generateId, getCustomers, getProducts, processSaleReturn } from '../services/db';
import { exportToExcel, importFromExcel } from '../services/excel';
import { useNavigate } from 'react-router-dom';

const SalesHistory: React.FC = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Return State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = () => {
    setSales(getSales());
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredSales.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredSales.map(s => s.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`${selectedIds.size} adet satışı silmek istediğinize emin misiniz? Sildiğiniz aktif satışların stokları iade edilecektir.`)) {
        selectedIds.forEach(id => deleteSale(id));
        setSales(prev => prev.filter(s => !selectedIds.has(s.id)));
        setSelectedIds(new Set());
        setTimeout(() => loadSales(), 50);
    }
  };

  const handleCancelSale = (e: React.MouseEvent, saleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Bu satışı iptal etmek istediğinize emin misiniz? Satılan ürünlerin stoğu geri yüklenecektir. Bu işlem geri alınamaz.')) {
        cancelSale(saleId);
        setSales(prev => prev.map(s => s.id === saleId ? {...s, status: 'cancelled'} : s));
        setTimeout(() => loadSales(), 50);
    }
  };

  const handleDeleteSale = (e: React.MouseEvent, saleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Bu siparişi TAMAMEN silmek istediğinize emin misiniz? Eğer iptal edilmediyse stoklar iade edilecektir.')) {
        deleteSale(saleId);
        setSales(prev => prev.filter(s => s.id !== saleId));
        if (selectedIds.has(saleId)) {
            const next = new Set(selectedIds);
            next.delete(saleId);
            setSelectedIds(next);
        }
        setTimeout(() => loadSales(), 50);
    }
  };

  const handleEditSale = (e: React.MouseEvent, saleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/sales/${saleId}`);
  };

  const openReturnModal = (e: React.MouseEvent, sale: Sale) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedSaleForReturn(sale);
      const initialQtys: Record<string, number> = {};
      sale.items.forEach(item => {
          initialQtys[item.productId] = item.returnedQuantity || 0;
      });
      setReturnQuantities(initialQtys);
      setIsReturnModalOpen(true);
  };

  const handleProcessReturn = () => {
      if (!selectedSaleForReturn) return;
      /* Fixed: Explicitly typed returnQty as number to resolve unknown type error */
      const returnData = Object.entries(returnQuantities).map(([productId, returnQty]) => ({
          productId,
          returnQty: returnQty as number
      }));
      processSaleReturn(selectedSaleForReturn.id, returnData);
      loadSales();
      setIsReturnModalOpen(false);
      setSelectedSaleForReturn(null);
  };

  const handleExport = () => {
      const products = getProducts();
      const exportData: any[] = [];
      
      sales.forEach(s => {
          s.items.forEach(item => {
              const p = products.find(prod => prod.id === item.productId);
              
              exportData.push({
                  "Sipariş No": s.orderNumber || s.id.substring(0,8),
                  "Tarih": new Date(s.date).toLocaleDateString('tr-TR'),
                  "Müşteri": s.customerName,
                  "Barkod": p?.barcode || "",
                  "Ürün Adı": item.productName,
                  "Adet": item.quantity,
                  "İade Edilen": item.returnedQuantity || 0,
                  "Birim Fiyat": item.unitPrice,
                  "Satır Toplamı": item.totalPrice,
                  "İskonto (Sipariş Bazlı)": s.discount,
                  "Durum": s.status === 'cancelled' ? "İptal" : "Tamamlandı"
              });
          });
      });
      
      exportToExcel(exportData, "satis_gecmisi_detayli");
  };

  const filteredSales = sales.filter(s => 
    s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.id && s.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.orderNumber && s.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedSales = [...filteredSales].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    
    if (dateA !== dateB) {
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    }
    
    // If dates are equal, sort by order number
    const orderA = a.orderNumber || '';
    const orderB = b.orderNumber || '';
    return sortOrder === 'newest' ? orderB.localeCompare(orderA) : orderA.localeCompare(orderB);
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Satış Geçmişi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tüm satışları ve iadeleri yönetin.</p>
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
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-green-200 dark:shadow-none"
            >
                <Download size={18} />
                <span className="hidden md:inline">Excel İndir</span>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center flex-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                <Search className="text-gray-400 mr-2" size={20}/>
                <input 
                    type="text" 
                    placeholder="Müşteri adı, işlem ID veya sipariş no ara..." 
                    className="bg-transparent border-none outline-none text-gray-700 dark:text-white w-full text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <button 
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
            >
                <ArrowUpDown size={16} />
                {sortOrder === 'newest' ? 'Yeniden Eskiye' : 'Eskiden Yeniye'}
            </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-sm">
              <tr>
                <th className="w-10 pl-6 pr-0 py-3">
                    <button onClick={handleSelectAll} className="p-1 rounded hover:bg-gray-200 transition-colors">
                        {selectedIds.size === filteredSales.length && filteredSales.length > 0 ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                    </button>
                </th>
                <th className="px-6 py-3">Tarih / ID</th>
                <th className="px-6 py-3">Müşteri</th>
                <th className="px-6 py-3">Detay</th>
                <th className="px-6 py-3">Tutar</th>
                <th className="px-6 py-3">Durum</th>
                <th className="px-6 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedSales.length > 0 ? (
                sortedSales.map((sale) => {
                  const hasReturn = sale.items.some(i => (i.returnedQuantity || 0) > 0);
                  
                  return (
                  <tr key={sale.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${sale.status === 'cancelled' ? 'bg-gray-50/50 dark:bg-gray-800/50 opacity-70' : ''} ${selectedIds.has(sale.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                    <td className="w-10 pl-6 pr-0 py-4">
                        <button onClick={() => handleToggleSelect(sale.id)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                            {selectedIds.has(sale.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                        </button>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
                            <Calendar size={14} className="mr-1 text-gray-400"/>
                            {new Date(sale.date).toLocaleDateString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                             {sale.orderNumber ? (
                                <span className="font-semibold text-blue-600 dark:text-blue-400">#{sale.orderNumber}</span>
                             ) : (
                                <span>#{sale.id.substring(0,6)}</span>
                             )}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                        {sale.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                             <Receipt size={14} />
                             <span>{sale.items.length} Kalem Ürün</span>
                        </div>
                        {hasReturn && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 mt-1">
                                <RotateCcw size={10} /> İade Alındı
                            </div>
                        )}
                    </td>
                    <td className={`px-6 py-4 font-bold ${sale.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-blue-600 dark:text-blue-400'}`}>
                        ₺{sale.totalAmount.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4">
                        {sale.status === 'cancelled' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                <AlertCircle size={12} /> İptal Edildi
                            </span>
                        ) : hasReturn ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                <RotateCcw size={12} /> Kısmi İade
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                <CheckCircle size={12} /> Tamamlandı
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end space-x-2">
                        {sale.status !== 'cancelled' && (
                             <>
                                <button 
                                    onClick={(e) => handleEditSale(e, sale.id)}
                                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                    title="Düzenle"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                    onClick={(e) => openReturnModal(e, sale)}
                                    className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                                    title="İade Al"
                                >
                                    <RotateCcw size={16} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => handleCancelSale(e, sale.id)}
                                    className="text-gray-400 hover:text-orange-600 text-xs font-medium hover:underline focus:outline-none"
                                >
                                    İptal Et
                                </button>
                             </>
                        )}
                        <button 
                            type="button"
                            onClick={(e) => handleDeleteSale(e, sale.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Siparişi Sil"
                        >
                            <Trash2 size={16} />
                        </button>
                       </div>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Kayıtlı satış bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal */}
      {isReturnModalOpen && selectedSaleForReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-orange-50 dark:bg-orange-900/20">
                      <div className="flex items-center gap-3">
                          <RotateCcw className="text-orange-600" />
                          <h3 className="font-bold text-gray-800 dark:text-white">İade İşlemi Yönetimi</h3>
                      </div>
                      <button onClick={() => setIsReturnModalOpen(false)}><X className="text-gray-400" /></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                          <p className="text-xs text-gray-400 uppercase font-black">Müşteri</p>
                          <p className="font-bold text-gray-800 dark:text-white">{selectedSaleForReturn.customerName}</p>
                      </div>

                      <div className="space-y-3">
                          <p className="text-xs font-black text-gray-400 uppercase">Ürün Listesi ve İade Miktarları</p>
                          {selectedSaleForReturn.items.map((item) => (
                              <div key={item.productId} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                                  <div className="flex-1 min-w-0 mr-4">
                                      <p className="font-bold text-sm text-gray-800 dark:text-white truncate">{item.productName}</p>
                                      <p className="text-[10px] text-gray-500 uppercase">Satılan: {item.quantity} | Kalan: {item.quantity - (returnQuantities[item.productId] || 0)}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <input 
                                          type="number" 
                                          min="0"
                                          max={item.quantity}
                                          className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-center font-bold dark:bg-gray-800"
                                          value={returnQuantities[item.productId] || 0}
                                          onChange={(e) => setReturnQuantities({...returnQuantities, [item.productId]: Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0))})}
                                      />
                                      <span className="text-xs font-bold text-gray-400">Adet</span>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-3">
                          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-blue-800 dark:text-blue-200">
                              Girilen iade miktarları kadar ürün stoklarınıza otomatik olarak geri eklenecektir. İade edilen tutar cironuzdan düşürülür ancak kayıt satış geçmişinde kalmaya devam eder.
                          </p>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                          <button onClick={() => setIsReturnModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold">İptal</button>
                          <button onClick={handleProcessReturn} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-200 flex items-center gap-2">
                              <Save size={18} /> İadeyi Tamamla
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SalesHistory;
