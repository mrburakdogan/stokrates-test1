import React, { useState, useEffect } from 'react';
import { Calculator, Save, Trash2, Droplets, FlaskConical, Beaker, Package, Truck, Percent, CheckCircle, Info } from 'lucide-react';
import { getProducts, saveProduct } from '../services/db';
import { Product } from '../types';
import SearchableSelect from '../components/SearchableSelect';

const ProductionCostAnalysis: React.FC = () => {
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [producedQuantity, setProducedQuantity] = useState(1);
  const [profitMargin, setProfitMargin] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form State
  const [essence, setEssence] = useState({ unitPrice: 0, unitAmount: 1, usedAmount: 0 });
  const [alcohol, setAlcohol] = useState({ literPrice: 0, usedAmount: 0 });
  const [water, setWater] = useState({ literPrice: 0, usedAmount: 0 });
  const [packaging, setPackaging] = useState({ bottleCap: 0, boxLabel: 0, cargoOther: 0 });

  useEffect(() => {
    setDbProducts(getProducts());
  }, []);

  // Calculation Logic
  const essenceTotal = (essence.unitPrice / (essence.unitAmount || 1)) * essence.usedAmount;
  const alcoholTotal = (alcohol.literPrice / 1000) * alcohol.usedAmount;
  const waterTotal = (water.literPrice / 1000) * water.usedAmount;
  
  const unitCost = essenceTotal + alcoholTotal + waterTotal + packaging.bottleCap + packaging.boxLabel + packaging.cargoOther;
  const netProfit = unitCost * (profitMargin / 100);
  const salePrice = unitCost + netProfit;

  const handleSave = () => {
    const product = dbProducts.find(p => p.id === selectedProductId);
    if (!product) {
      alert("Lütfen bir ürün seçiniz.");
      return;
    }

    if (unitCost <= 0) {
        alert("Hesaplanan maliyet 0 olamaz.");
        return;
    }

    if (window.confirm(`${product.name} ürününün maliyetini ₺${unitCost.toFixed(2)} olarak güncellemek istiyor musunuz?`)) {
        const updatedProduct = { ...product, cost: parseFloat(unitCost.toFixed(2)) };
        saveProduct(updatedProduct);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleClear = () => {
      setSelectedProductId('');
      setEssence({ unitPrice: 0, unitAmount: 1, usedAmount: 0 });
      setAlcohol({ literPrice: 0, usedAmount: 0 });
      setWater({ literPrice: 0, usedAmount: 0 });
      setPackaging({ bottleCap: 0, boxLabel: 0, cargoOther: 0 });
      setProfitMargin(0);
  };

  const productOptions = dbProducts.map(p => ({
    value: p.id,
    label: p.name,
    subLabel: `Mevcut Maliyet: ₺${p.cost || 0}`
  }));

  const inputClass = "w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all";

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <Calculator className="text-blue-600" /> Parfüm & Üretim Maliyet Analizi
          </h1>
          <p className="text-sm text-gray-500 mt-1">Hammadde ve paketleme giderlerini hesaplayarak ürün kartını güncelleyin.</p>
        </div>
        {showSuccess && (
            <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-xl animate-bounce">
                <CheckCircle size={20} /> Kaydedildi
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Form Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section: Product Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Package size={16} /> Birim Üretim Giderleri (Tek Şişe)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <SearchableSelect 
                        label="ÜRÜN ADI / KODU" 
                        placeholder="Ürün listenizden seçim yapın..." 
                        options={productOptions} 
                        value={selectedProductId} 
                        onChange={setSelectedProductId} 
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">ÜRETİLEN ADET (Referans)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            className={inputClass} 
                            value={producedQuantity} 
                            onChange={e => setProducedQuantity(Number(e.target.value))} 
                        />
                        <div className="absolute right-3 top-2.5 text-gray-400"><Beaker size={16} /></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">İstatistiki veriler için kullanılır.</p>
                </div>
            </div>
          </div>

          {/* Section: Essence */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-yellow-600 uppercase mb-6 flex items-center gap-2">
                <Droplets size={16} /> Esans Maliyeti
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Birim Fiyat (TL)</label>
                    <input type="number" className={inputClass} value={essence.unitPrice || ''} onChange={e => setEssence({...essence, unitPrice: Number(e.target.value)})} placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Birim Miktar (gr/ml)</label>
                    <input type="number" className={inputClass} value={essence.unitAmount || ''} onChange={e => setEssence({...essence, unitAmount: Number(e.target.value)})} placeholder="1" />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Kullanılan (gr)</label>
                    <input type="number" className={inputClass} value={essence.usedAmount || ''} onChange={e => setEssence({...essence, usedAmount: Number(e.target.value)})} placeholder="0" />
                </div>
            </div>
            <div className="mt-4 text-right">
                <span className="text-xs text-gray-400 font-bold uppercase">Esans Tutarı: </span>
                <span className="text-lg font-bold text-gray-800 dark:text-white">₺{essenceTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Section: Alcohol */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-blue-500 uppercase mb-6 flex items-center gap-2">
                    <FlaskConical size={16} /> Alkol
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Litre Fiyatı (TL)</label>
                        <input type="number" className={inputClass} value={alcohol.literPrice || ''} onChange={e => setAlcohol({...alcohol, literPrice: Number(e.target.value)})} placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Kullanılan (ml)</label>
                        <input type="number" className={inputClass} value={alcohol.usedAmount || ''} onChange={e => setAlcohol({...alcohol, usedAmount: Number(e.target.value)})} placeholder="0" />
                    </div>
                </div>
                <div className="mt-4 text-right pt-4 border-t border-gray-50 dark:border-gray-700">
                    <span className="text-xs text-gray-400 font-bold">Tutar: </span>
                    <span className="font-bold text-gray-800 dark:text-white">₺{alcoholTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>

              {/* Section: Water */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-cyan-500 uppercase mb-6 flex items-center gap-2">
                    <Droplets size={16} /> Saf Su
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Litre Fiyatı (TL)</label>
                        <input type="number" className={inputClass} value={water.literPrice || ''} onChange={e => setWater({...water, literPrice: Number(e.target.value)})} placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Kullanılan (ml)</label>
                        <input type="number" className={inputClass} value={water.usedAmount || ''} onChange={e => setWater({...water, usedAmount: Number(e.target.value)})} placeholder="0" />
                    </div>
                </div>
                <div className="mt-4 text-right pt-4 border-t border-gray-50 dark:border-gray-700">
                    <span className="text-xs text-gray-400 font-bold">Tutar: </span>
                    <span className="font-bold text-gray-800 dark:text-white">₺{waterTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
          </div>

          {/* Section: Packaging */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-orange-500 uppercase mb-6 flex items-center gap-2">
                <Package size={16} /> Şişe & Ambalaj & Diğer
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Şişe + Kapak (TL)</label>
                    <input type="number" className={inputClass} value={packaging.bottleCap || ''} onChange={e => setPackaging({...packaging, bottleCap: Number(e.target.value)})} placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Kutu / Etiket (TL)</label>
                    <input type="number" className={inputClass} value={packaging.boxLabel || ''} onChange={e => setPackaging({...packaging, boxLabel: Number(e.target.value)})} placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Kargo/Diğer (TL)</label>
                    <input type="number" className={inputClass} value={packaging.cargoOther || ''} onChange={e => setPackaging({...packaging, cargoOther: Number(e.target.value)})} placeholder="0.00" />
                </div>
            </div>
          </div>

        </div>

        {/* Right Summary Area */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-6">
                <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <h2 className="font-bold text-gray-800 dark:text-white">Birim Özeti</h2>
                </div>

                <div className="p-8 space-y-8">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">1 ŞİŞE MALİYETİ</span>
                        <span className="text-2xl font-black text-red-600">₺{unitCost.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
                            <span className="flex items-center gap-1"><Percent size={12} /> Kâr Marjı</span>
                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md">%{profitMargin}</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="500" 
                            step="5" 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                            value={profitMargin} 
                            onChange={e => setProfitMargin(Number(e.target.value))} 
                        />
                    </div>

                    <div className="flex justify-between items-center border-t border-dashed border-gray-200 dark:border-gray-700 pt-6">
                        <span className="text-gray-500 font-medium">1 ŞİŞE NET KÂR</span>
                        <span className="text-xl font-bold text-yellow-600">+₺{netProfit.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-8 rounded-2xl border border-green-100 dark:border-green-800/50 text-center space-y-2">
                        <p className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest">BİRİM SATIŞ FİYATI</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-green-600 font-bold text-2xl">₺</span>
                            <span className="text-5xl font-black text-green-800 dark:text-green-200">{salePrice.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4">
                        <button 
                            onClick={handleSave}
                            disabled={!selectedProductId || unitCost <= 0}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-100 dark:shadow-none disabled:opacity-50 disabled:grayscale"
                        >
                            <Save size={20} /> Hesabı Kaydet
                        </button>
                        <button 
                            onClick={handleClear}
                            className="w-full py-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium transition-colors"
                        >
                            Temizle
                        </button>
                    </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 flex items-start gap-2 border-t border-gray-100 dark:border-gray-700">
                    <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-gray-500">Kâr marjı eklenmiş fiyat, önerilen satış fiyatıdır. Kaydet butonuna bastığınızda sadece maliyet verisi güncellenir.</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ProductionCostAnalysis;