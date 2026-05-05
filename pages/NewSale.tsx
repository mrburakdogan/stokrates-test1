
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Customer, Product, Sale, SaleItem, TrendyolAnalysisRecord, Platform, ShippingCompany } from '../types';
import { generateId, getCustomers, getProducts, saveSale, getSales, getShippingSettings, getTrendyolAnalysisForDate, getPlatforms } from '../services/db';
import { ShoppingCart, Check, Plus, Trash2, Receipt, Calendar, AlertTriangle, Hash, ArrowLeft, TrendingUp, Percent, Info, Truck, RotateCcw, Save, X, Star, Globe } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';

const NewSale: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompany[]>([]);
  const [shippingPrices, setShippingPrices] = useState<Record<number, number>>({});
  
  const isEditMode = !!id;

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [selectedShippingCompanyId, setSelectedShippingCompanyId] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<string>('0');
  const [commissionRate, setCommissionRate] = useState<string>('19');
  const [serviceFee, setServiceFee] = useState<string>('13.90');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [orderNumber, setOrderNumber] = useState('');
  const [currentStatus, setCurrentStatus] = useState<'completed' | 'cancelled'>('completed');
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [vatRate, setVatRate] = useState(20);
  
  // Analizden gelen bilgi
  const [activeAnalysis, setActiveAnalysis] = useState<TrendyolAnalysisRecord | null>(null);

  const [returnModal, setReturnModal] = useState<{ isOpen: boolean; itemIndex: number; tempQty: number } | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const allCustomers = getCustomers();
    const allProducts = getProducts();
    const settings = getShippingSettings();
    const allPlatforms = getPlatforms();
    
    setCustomers([...allCustomers].reverse());
    setProducts(allProducts);
    setPlatforms(allPlatforms);
    setShippingCompanies(settings.companies || []);
    setShippingPrices(settings.prices || {});

    if (isEditMode) {
        const allSales = getSales();
        const saleToEdit = allSales.find(s => s.id === id);
        if (saleToEdit) {
            setSelectedCustomerId(saleToEdit.customerId);
            setSelectedPlatformId(saleToEdit.platformId || '');
            setSelectedShippingCompanyId(saleToEdit.shippingCompanyId || '');
            setCart(saleToEdit.items);
            setDiscount(saleToEdit.discount.toString());
            setSaleDate(saleToEdit.date.split('T')[0]);
            setOrderNumber(saleToEdit.orderNumber || '');
            setCurrentStatus(saleToEdit.status || 'completed');
            setCommissionRate((saleToEdit.commissionRate || 19).toString());
            setServiceFee((saleToEdit.serviceFee || 13.90).toString());
        } else { navigate('/sales-history'); }
    }
  }, [id, isEditMode, navigate]);

  // Platform değiştiğinde varsayılanları güncelle
  useEffect(() => {
    if (!isEditMode && selectedPlatformId) {
        const platform = platforms.find(p => p.id === selectedPlatformId);
        if (platform) {
            setCommissionRate(platform.defaultCommissionRate.toString());
            setServiceFee(platform.defaultServiceFee.toString());
        }
    }
  }, [selectedPlatformId, platforms, isEditMode]);

  useEffect(() => {
    const analysis = getTrendyolAnalysisForDate(saleDate);
    setActiveAnalysis(analysis);
  }, [saleDate]);

  // Fiyat ve Analize göre en uygun komisyonu bulan fonksiyon
  const findCommissionForPrice = (barcode: string, unitPrice: number) => {
      if (!activeAnalysis) return null;
      const matchedProduct = activeAnalysis.products.find(p => p.barcode === barcode);
      if (!matchedProduct) return null;

      if (activeAnalysis.type === 'commission_tariff' && matchedProduct.tiers) {
          const tier = matchedProduct.tiers.find(t => unitPrice >= t.minPrice && (t.maxPrice === Infinity || unitPrice <= t.maxPrice));
          return tier ? tier.commissionRate : matchedProduct.tiers[0].commissionRate;
      } else if (activeAnalysis.type === 'advantage_tag' && matchedProduct.stars) {
          // Advantage tag'de manuel fiyat girilirse en yakın yıldızı bulmaya çalışırız veya baz komisyonu döneriz
          const star = matchedProduct.stars.find(s => unitPrice >= s.minPrice && unitPrice <= s.maxPrice);
          return star ? star.commissionUsed : (matchedProduct.baseCommission || 19);
      }
      return null;
  };

  const handleAddToCart = () => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) return;

    // Başlangıç komisyonu bul
    const initialComm = findCommissionForPrice(selectedProduct.barcode || '', selectedProduct.price);

    const unitPrice = selectedProduct.price;
    const totalPrice = unitPrice * (quantity || 0);
    const vatAmountPerItem = unitPrice - (unitPrice / (1 + vatRate / 100));
    const totalVatAmount = vatAmountPerItem * (quantity || 0);

    const newItem: SaleItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: quantity,
        returnedQuantity: 0,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        vatRate: vatRate,
        vatAmount: totalVatAmount,
        analysisCommission: initialComm ?? undefined
    };

    const existingIndex = cart.findIndex(i => i.productId === newItem.productId && i.vatRate === newItem.vatRate);
    if (existingIndex >= 0) {
        const updatedCart = [...cart];
        updatedCart[existingIndex].quantity += (quantity || 0);
        updatedCart[existingIndex].totalPrice += totalPrice;
        updatedCart[existingIndex].vatAmount += totalVatAmount;
        setCart(updatedCart);
    } else { setCart([...cart, newItem]); }

    setSelectedProductId('');
    setQuantity(1);
  };

  const handleItemLineTotalChange = (index: number, newLineTotalStr: string) => {
    const newLineTotal = parseFloat(newLineTotalStr) || 0;
    const newCart = [...cart];
    const item = newCart[index];
    
    item.totalPrice = newLineTotal;
    item.unitPrice = newLineTotal / (item.quantity || 1);
    item.vatAmount = (item.unitPrice - (item.unitPrice / (1 + item.vatRate / 100))) * item.quantity;

    // Barkoda göre analizi bul ve komisyonu güncelle
    const product = products.find(p => p.id === item.productId);
    if (product && product.barcode) {
        const dynamicComm = findCommissionForPrice(product.barcode, item.unitPrice);
        if (dynamicComm !== null) {
            item.analysisCommission = dynamicComm;
        }
    }

    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
      const newCart = [...cart];
      newCart.splice(index, 1);
      setCart(newCart);
  };

  const openReturnModal = (index: number) => {
      const item = cart[index];
      setReturnModal({ isOpen: true, itemIndex: index, tempQty: item.returnedQuantity || 0 });
  };

  const confirmReturnQty = () => {
      if (!returnModal) return;
      const newCart = [...cart];
      const item = newCart[returnModal.itemIndex];
      item.returnedQuantity = Math.min(item.quantity, Math.max(0, returnModal.tempQty));
      setCart(newCart);
      setReturnModal(null);
  };

  // HESAPLAMALAR
  const subTotal = cart.reduce((acc, item) => {
      const activeQty = item.quantity - (item.returnedQuantity || 0);
      return acc + (activeQty * item.unitPrice);
  }, 0);

  const totalItemVat = cart.reduce((acc, item) => {
      const activeQty = item.quantity - (item.returnedQuantity || 0);
      const vatPerUnit = item.vatAmount / item.quantity;
      return acc + (activeQty * vatPerUnit);
  }, 0);

  const discountAmount = parseFloat(discount) || 0;
  const discountRatio = subTotal > 0 ? (subTotal - discountAmount) / subTotal : 1;
  const finalVat = totalItemVat * discountRatio;
  const totalAmount = Math.max(0, subTotal - discountAmount);

  const totalActiveQty = cart.reduce((acc, item) => acc + (item.quantity - (item.returnedQuantity || 0)), 0);
  const totalCostOfCart = cart.reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      const activeQty = item.quantity - (item.returnedQuantity || 0);
      return acc + ((product?.cost || 0) * activeQty);
  }, 0);

  const calculatedDesi = totalActiveQty > 0 ? Math.ceil(totalActiveQty / 5) : 0;
  const selectedCompany = shippingCompanies.find(c => c.id === selectedShippingCompanyId);
  const pricesToUse = selectedCompany ? selectedCompany.prices : shippingPrices;
  const totalShippingOfCart = pricesToUse[calculatedDesi] || (totalActiveQty > 0 ? (pricesToUse[1] || 35) : 0);

  const defaultCommRate = parseFloat(commissionRate) || 0;
  const totalCommission = cart.reduce((acc, item) => {
      const activeQty = item.quantity - (item.returnedQuantity || 0);
      const itemTotal = activeQty * item.unitPrice;
      const netItemTotal = itemTotal * discountRatio;
      const rate = item.analysisCommission ?? defaultCommRate;
      return acc + (netItemTotal * (rate / 100));
  }, 0);

  const singleServiceFeeValue = parseFloat(serviceFee) || 0;
  const totalServiceFee = singleServiceFeeValue * totalActiveQty;

  const netCost = totalCostOfCart;
  const netShipping = totalShippingOfCart;
  const netCommission = totalCommission;
  const netServiceFee = totalServiceFee;
  const netSale = totalAmount - finalVat;

  const commissionVat = (netCommission + netServiceFee) * 0.20;
  const shippingVat = netShipping * 0.20;
  const payableVat = finalVat - commissionVat - shippingVat;

  const estimatedProfit = totalAmount - payableVat - netCost - netShipping - netCommission - netServiceFee;

  const handleManualTotalChange = (val: string) => {
    const newTotal = parseFloat(val);
    if (!isNaN(newTotal)) {
        const calculatedDiscount = subTotal - newTotal;
        setDiscount(calculatedDiscount.toFixed(2));
    } else if (val === '') { setDiscount('0'); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    if (!selectedCustomer || cart.length === 0) return;
    const sale: Sale = {
      id: id || generateId(), 
      orderNumber: orderNumber || undefined, 
      customerId: selectedCustomer.id, 
      customerName: selectedCustomer.name,
      platformId: selectedPlatformId || undefined,
      shippingCompanyId: selectedShippingCompanyId || undefined,
      items: cart, 
      subTotal: subTotal, 
      discount: discountAmount, 
      totalAmount: totalAmount, 
      totalVat: finalVat,
      date: new Date(saleDate).toISOString(), 
      status: currentStatus, 
      commissionRate: defaultCommRate, 
      serviceFee: singleServiceFeeValue
    };
    saveSale(sale); setSuccess(true);
    setTimeout(() => { navigate(isEditMode ? '/sales-history' : '/'); }, 1500);
  };

  const customerOptions = customers.map(c => ({ value: c.id, label: c.name, subLabel: c.phone }));
  const productOptions = products.map(p => ({ value: p.id, label: p.name, subLabel: `Stok: ${p.stock} | ₺${p.price.toLocaleString('tr-TR')}`, disabled: false }));

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6"> <Check size={40} /> </div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{isEditMode ? 'Satış Güncellendi!' : 'Satış Tamamlandı!'}</h2>
        <p className="text-gray-500 dark:text-gray-400">Veriler kaydedildi, yönlendiriliyorsunuz...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
         <div className="flex items-center gap-4">
            {isEditMode && ( <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"> <ArrowLeft size={24} /> </button> )}
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{isEditMode ? 'Satış Bilgilerini Düzenle' : 'Yeni Satış Fişi'}</h1>
            </div>
         </div>
         <div className="flex items-center flex-wrap gap-3">
             {/* Platform & Kargo Seçimi */}
             <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-x divide-gray-100 dark:divide-gray-700 transition-all">
                 <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                     <Globe size={16} className="text-blue-500" />
                     <select 
                        value={selectedPlatformId} 
                        onChange={(e) => setSelectedPlatformId(e.target.value)}
                        className="text-xs font-bold text-gray-700 dark:text-gray-200 bg-transparent border-none outline-none cursor-pointer min-w-[120px]"
                     >
                         <option value="" className="dark:bg-gray-800">Platform Seçin</option>
                         {platforms.map(p => (
                             <option key={p.id} value={p.id} className="dark:bg-gray-800">{p.name}</option>
                         ))}
                     </select>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                     <Truck size={16} className="text-purple-500" />
                     <select 
                        value={selectedShippingCompanyId} 
                        onChange={(e) => setSelectedShippingCompanyId(e.target.value)}
                        className="text-xs font-bold text-gray-700 dark:text-gray-200 bg-transparent border-none outline-none cursor-pointer min-w-[120px]"
                     >
                         <option value="" className="dark:bg-gray-800">Kargo Firması</option>
                         {shippingCompanies.map(c => (
                             <option key={c.id} value={c.id} className="dark:bg-gray-800">{c.name}</option>
                         ))}
                     </select>
                 </div>
             </div>

             <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-x divide-gray-100 dark:divide-gray-700 transition-all">
                 <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                     <Hash size={16} className="text-gray-400" />
                     <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Sipariş No" className="text-xs text-gray-700 dark:text-gray-200 bg-transparent border-none outline-none font-medium w-24 md:w-32" />
                 </div>
                 <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                     <Calendar size={16} className="text-gray-400" />
                     <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="text-xs text-gray-700 dark:text-gray-200 bg-transparent border-none outline-none font-medium cursor-pointer" />
                 </div>
             </div>
         </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <SearchableSelect label="Müşteri Seçimi" placeholder="Müşteri ara..." options={customerOptions} value={selectedCustomerId} onChange={setSelectedCustomerId} required />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-5 transition-colors">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3 mb-2">
                    <h3 className="font-bold text-gray-800 dark:text-white uppercase text-sm tracking-widest">Ürün Ekle</h3>
                </div>
                <SearchableSelect label="Ürün" placeholder="Ürün ara..." options={productOptions} value={selectedProductId} onChange={(val) => { setSelectedProductId(val); setQuantity(1); }} />
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Adet</label>
                        <input type="number" min="1" className="form-input w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} disabled={!selectedProductId} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">KDV (%)</label>
                        <select className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-gray-700 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 appearance-none" value={vatRate} onChange={(e) => setVatRate(parseInt(e.target.value))} disabled={!selectedProductId}>
                            <option value="0">%0</option><option value="1">%1</option><option value="10">%10</option><option value="20">%20</option>
                        </select>
                    </div>
                </div>
                <button type="button" onClick={handleAddToCart} disabled={!selectedProductId || quantity <= 0} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg shadow-blue-200 dark:shadow-none flex justify-center items-center gap-2 mt-2 disabled:opacity-50"> <Plus size={20} /> Sepete Ekle </button>
            </div>
            
        </div>

        <div className="lg:col-span-8 flex flex-col h-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 flex flex-col overflow-hidden transition-colors">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-white flex items-center justify-between"> 
                    <div className="flex items-center gap-2">
                        <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" /> 
                        Satış Sepeti 
                    </div>
                    {activeAnalysis && (
                        <div className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-[10px] font-black border border-orange-200 dark:border-orange-800 animate-pulse">
                            <Star size={12} fill="currentColor"/> DİNAMİK ANALİZ AKTİF
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full"> <Receipt size={32} className="opacity-40" /> </div>
                            <p>Sepet boş.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="text-gray-400 border-b border-gray-100 dark:border-gray-700 text-[10px] uppercase font-black tracking-wider">
                                <tr> 
                                    <th className="text-left py-3 pl-2">Ürün</th> 
                                    <th className="text-center py-3">Adet</th> 
                                    <th className="text-center py-3">Tutar (Düzenle)</th> 
                                    <th className="text-center py-3">Komisyon</th>
                                    <th className="text-right py-3 pr-2">Net Tutar</th> 
                                    <th className="w-10"></th> 
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {cart.map((item, idx) => {
                                    const isFullyReturned = (item.returnedQuantity || 0) >= item.quantity;
                                    const activeQty = item.quantity - (item.returnedQuantity || 0);
                                    return (
                                    <tr key={idx} className={`group transition-colors ${isFullyReturned ? 'bg-red-50/50 dark:bg-red-900/10 opacity-60' : 'hover:bg-blue-50/50 dark:hover:bg-gray-700'}`}>
                                        <td className="py-4 pl-2">
                                            <div className={`font-bold text-xs ${isFullyReturned ? 'text-red-600 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {item.productName}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">Birim Fiyat: ₺{item.unitPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</div>
                                        </td>
                                        <td className="py-4 text-center text-gray-800 dark:text-gray-200 font-bold"> 
                                            x{activeQty}
                                        </td>
                                        <td className="py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="text-gray-400 text-xs">₺</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={item.totalPrice}
                                                    onChange={(e) => handleItemLineTotalChange(idx, e.target.value)}
                                                    className="w-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-center font-black text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-sm"
                                                    title="Toplam satır tutarını düzenle"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <div className={`inline-flex flex-col items-center px-2 py-1 rounded-lg border ${item.analysisCommission ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                                                <span className={`text-xs font-black ${item.analysisCommission ? 'text-orange-600' : 'text-gray-500'}`}>
                                                    %{item.analysisCommission ?? commissionRate}
                                                </span>
                                                <span className="text-[8px] text-gray-400 uppercase font-bold">{item.analysisCommission ? 'Analizden' : 'Genel'}</span>
                                            </div>
                                        </td>
                                        <td className={`py-4 text-right font-black pr-2 text-sm ${isFullyReturned ? 'text-red-400 line-through' : 'text-gray-900 dark:text-white'}`}> 
                                            ₺{item.totalPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2})} 
                                        </td>
                                        <td className="py-4 text-right"> 
                                            <div className="flex items-center justify-end gap-1 px-2"> 
                                                <button onClick={() => openReturnModal(idx)} className="p-1.5 rounded-lg text-gray-400 hover:bg-orange-100 hover:text-orange-600 transition-colors" title="İade"> <RotateCcw size={14} /> </button> 
                                                <button onClick={() => removeFromCart(idx)} className="text-gray-300 hover:text-red-500 p-1.5 transition-colors" title="Sil"> <Trash2 size={14} /> </button> 
                                            </div> 
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs font-bold uppercase tracking-widest"> <span>Ara Toplam (Brüt)</span> <span>₺{subTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span> </div>
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 text-xs font-bold uppercase tracking-widest"> <span>İskonto / İndirim (₺)</span> <input type="number" min="0" step="0.01" className="w-28 text-right border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold" value={discount} onChange={(e) => setDiscount(e.target.value)} /> </div>
                    
                    <div className="flex justify-between text-xl font-bold text-blue-800 dark:text-blue-300 pt-3 border-t border-gray-200/60 dark:border-gray-700 mt-2"> 
                        <span>GENEL TOPLAM</span> 
                        <div className="relative"> 
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span> 
                            <input type="number" step="0.01" className="w-40 text-right border-none bg-blue-100/50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-xl px-4 py-2 text-xl font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={totalAmount.toFixed(2)} onChange={(e) => handleManualTotalChange(e.target.value)} /> 
                        </div> 
                    </div>
                    
                    {cart.length > 0 && subTotal > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-black text-xs uppercase"> <TrendingUp size={16} /> Tahmini Net Kâr </div>
                                <span className={`font-black text-lg ${estimatedProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}> ₺{estimatedProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </span>
                            </div>
                            
                            <div className="pt-3 border-t border-green-100 dark:border-green-800/50 grid grid-cols-2 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1.5"> <Receipt size={12} className="text-gray-400" /> Brüt Tutar: </div>
                                <div className="text-right text-gray-700 dark:text-gray-200"> ₺{subTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </div>
                                
                                <div className="flex items-center gap-1.5"> <RotateCcw size={12} className="text-gray-400" /> İndirim: </div>
                                <div className="text-right text-red-500"> -₺{discountAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </div>
                                
                                <div className="flex items-center gap-1.5"> <Info size={12} className="text-gray-400" /> KDV (Satış): </div>
                                <div className="text-right text-red-500"> -₺{finalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </div>

                                <div className="flex items-center gap-1.5"> <Info size={12} className="text-blue-400" /> KDV (Gider İndirimi): </div>
                                <div className="text-right text-green-600"> +₺{(commissionVat + shippingVat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </div>

                                <div className="flex items-center gap-1.5 font-black text-blue-600 dark:text-blue-400"> <Receipt size={12} /> Ödenecek Net KDV: </div>
                                <div className="text-right font-black text-blue-600 dark:text-blue-400"> ₺{Math.max(0, payableVat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </div>
                                
                                <div className="flex items-center gap-1.5"> <Percent size={12} className="text-gray-400" /> Komisyon: </div>
                                <div className="text-right text-red-500"> -₺{totalCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </div>
                                
                                <div className="flex items-center gap-1.5"> <Truck size={12} className="text-gray-400" /> Kargo: </div>
                                <div className="text-right text-red-500"> -₺{totalShippingOfCart.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </div>

                                <div className="flex items-center gap-1.5"> <ShoppingCart size={12} className="text-gray-400" /> Maliyet: </div>
                                <div className="text-right text-red-500"> -₺{totalCostOfCart.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </div>

                                <div className="flex items-center gap-1.5"> <Info size={12} className="text-gray-400" /> Hizmet Bedeli: </div>
                                <div className="text-right text-red-500"> -₺{totalServiceFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} </div>
                            </div>
                        </div>
                    )}
                    <button onClick={handleSubmit} disabled={cart.length === 0 || !selectedCustomerId} className={`w-full text-white py-3.5 rounded-xl font-bold transition shadow-lg mt-4 disabled:opacity-50 ${isEditMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'} `}> {isEditMode ? 'Güncelle' : 'Satışı Tamamla'} </button>
                </div>
            </div>
        </div>
      </div>

      {returnModal && returnModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-700 animate-scale-up">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20">
                      <div className="flex items-center gap-3"> <RotateCcw size={20} className="text-orange-600" /> <h3 className="font-bold text-gray-800 dark:text-white">İade Adedi</h3> </div>
                  </div>
                  <div className="p-6 space-y-4">
                      <input type="number" min="0" max={cart[returnModal.itemIndex].quantity} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-900 text-lg font-black outline-none focus:ring-4 focus:ring-orange-500/10" value={returnModal.tempQty} onChange={(e) => setReturnModal({...returnModal, tempQty: parseInt(e.target.value) || 0})} autoFocus />
                      <div className="flex gap-3"> <button onClick={() => setReturnModal(null)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all">İptal</button> <button onClick={confirmReturnQty} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold transition-all">Onayla</button> </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default NewSale;
