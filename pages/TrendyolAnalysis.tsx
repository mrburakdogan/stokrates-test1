
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, Search, Filter, Calendar, X, AlertTriangle, Calculator, ImageIcon, CheckCircle, Download, Circle, Star, Award, TrendingUp, Check, Save, Database, RefreshCw, Info } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { getProducts, getShippingSettings, saveTrendyolAnalysis, generateId } from '../services/db';
import { Product, ShippingSettings, TrendyolAnalysisRecord } from '../types';

// --- SHARED TYPES ---
interface PriceSelection {
    type: 'tier' | 'manual' | 'star';
    id: number | string; 
    price: number;
    commission: number;
}

interface TierData {
    id: number;
    minPrice: number;
    maxPrice: number;
    commissionRate: number;
    estimatedProfit: number;
    profitMargin: number;
    referencePriceUsed: number;
}

interface AnalyzedProduct {
    id: string;
    barcode: string;
    name: string;
    modelCode: string;
    category: string;
    brand: string;
    stock: number;
    currentPrice: number;
    tiers: TierData[];
    dbCost: number;
    dbDesi: number;
    isMatched: boolean;
    shippingCost: number;
    image?: string;
    manualPrice: string;
    manualProfit: number | null;
    manualMargin: number | null;
    manualCommission: number | null; 
    selection: PriceSelection | null;
    rawRowData: any; 
}

interface StarData {
    level: 1 | 2 | 3;
    minPrice: number;
    maxPrice: number;
    targetPrice: number; 
    commissionUsed: number; 
    estimatedProfit: number;
    profitMargin: number;
}

interface AdvantageProduct {
    id: string;
    barcode: string;
    name: string;
    modelCode: string;
    category: string;
    brand: string;
    stock: number;
    currentPrice: number;
    stars: StarData[];
    dbCost: number;
    dbDesi: number;
    isMatched: boolean;
    shippingCost: number;
    image?: string;
    baseCommissionRate: number; 
    manualPrice: string;
    manualProfit: number | null;
    manualMargin: number | null;
    manualCommission: number | null; 
    selection: PriceSelection | null;
    rawRowData: any;
}

const STORAGE_KEY = 'trendyol_analysis_state';

const TrendyolAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'commission_tariff' | 'advantage_tag'>('commission_tariff');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>({ prices: {}, defaultPrice: 0 });
  const [filters, setFilters] = useState({ text: '', minStock: '', maxStock: '', brand: '', category: '' });
  const [products, setProducts] = useState<AnalyzedProduct[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [advantageProducts, setAdvantageProducts] = useState<AdvantageProduct[]>([]);
  const [advantageFileName, setAdvantageFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const advantageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      setDbProducts(getProducts());
      setShippingSettings(getShippingSettings());
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
          try {
              const parsedState = JSON.parse(savedState);
              if (parsedState.dateRange && parsedState.dateRange.end) {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const endDate = new Date(parsedState.dateRange.end);
                  if (today <= endDate) {
                      setProducts(parsedState.products || []);
                      setAdvantageProducts(parsedState.advantageProducts || []);
                      setDateRange(parsedState.dateRange);
                      setFileName(parsedState.fileName);
                      setAdvantageFileName(parsedState.advantageFileName);
                  } else { localStorage.removeItem(STORAGE_KEY); }
              }
          } catch (e) { localStorage.removeItem(STORAGE_KEY); }
      }
  }, []);

  useEffect(() => {
      if ((products.length > 0 || advantageProducts.length > 0) && dateRange.end) {
          const stateToSave = { products, advantageProducts, dateRange, fileName, advantageFileName };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      }
  }, [products, advantageProducts, dateRange, fileName, advantageFileName]);

  const calculateProfitInternal = (sellingPrice: number, cost: number, shipping: number, commRate: number) => {
      if (sellingPrice <= 0) return { profit: 0, margin: 0 };
      const VAT_RATE = 0.20; const STOPAJ_RATE = 0.044; const SERVICE_FEE = 13.90; 
      const commAmt = sellingPrice * (commRate / 100);
      const stopajAmt = commAmt * STOPAJ_RATE;
      const kFactor = 1 - (1 / (1 + VAT_RATE)); 
      const outVat = sellingPrice * kFactor;
      const inVat = (cost + shipping + SERVICE_FEE + commAmt) * kFactor;
      const netVatPayable = Math.max(0, outVat - inVat);
      const totalExpenses = cost + shipping + SERVICE_FEE + commAmt + stopajAmt + netVatPayable;
      const netProfit = sellingPrice - totalExpenses;
      const margin = (netProfit / sellingPrice) * 100;
      return { profit: netProfit, margin: margin };
  };

  const getShippingCost = (desi: number) => {
      const ceiledDesi = Math.ceil(desi || 1); 
      return shippingSettings.prices[ceiledDesi] || shippingSettings.defaultPrice || 35; 
  };

  const getVal = (row: any, keys: string[]) => {
      for (const key of keys) {
          if (row[key] !== undefined && row[key] !== "") {
              if (typeof row[key] === 'string') {
                  let clean = row[key].replace('TL', '').trim();
                  if (clean.includes(',') && clean.includes('.')) { clean = clean.replace(/\./g, '').replace(',', '.'); }
                  else if (clean.includes(',')) { clean = clean.replace(',', '.'); }
                  const val = parseFloat(clean);
                  return isNaN(val) ? 0 : val;
              }
              return Number(row[key]) || 0;
          }
      }
      return 0;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return; setFileName(file.name);
      try {
          const buffer = await file.arrayBuffer();
          const workbook = read(buffer);
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = utils.sheet_to_json<any>(sheet, { defval: "" });
          const parsedProducts: AnalyzedProduct[] = jsonData.map((row, index) => {
              const barcode = String(row['BARKOD'] || '').trim();
              const matchedProduct = dbProducts.find(p => p.barcode === barcode);
              const cost = matchedProduct ? matchedProduct.cost : 0;
              const desi = matchedProduct ? (matchedProduct.desi || 1) : 1;
              const shipping = getShippingCost(desi);
              const productImg = matchedProduct?.images?.[0]?.data;
              const tiers: TierData[] = [];
              const createTier = (id: number, min: number, max: number, comm: number) => {
                  if (comm <= 0) return null;
                  let refPrice = max !== Infinity ? max : Math.max(min, getVal(row, ['GÜNCEL TSF', 'GUNCEL TSF']) || min);
                  const { profit, margin } = calculateProfitInternal(refPrice, cost, shipping, comm);
                  return { id, minPrice: min, maxPrice: max, commissionRate: comm, estimatedProfit: profit, profitMargin: margin, referencePriceUsed: refPrice };
              };
              const t1Min = getVal(row, ['1.Fiyat Alt Limit', '1.Fiyat Alt', '1. Fiyat Alt Limit']);
              const t1Comm = getVal(row, ['1.KOMİSYON', '1. Komisyon']);
              const t1 = createTier(1, t1Min, Infinity, t1Comm); if (t1) tiers.push(t1);
              const t2Min = getVal(row, ['2.Fiyat Alt Limit', '2. Fiyat Alt Limit']);
              const t2Max = getVal(row, ['2.Fiyat Üst Limit', '2. Fiyat Üst Limit']);
              const t2Comm = getVal(row, ['2.KOMİSYON', '2. Komisyon']);
              const t2 = createTier(2, t2Min, t2Max || t1Min, t2Comm); if (t2) tiers.push(t2);
              const t3Min = getVal(row, ['3.Fiyat Alt Limit', '3. Fiyat Alt Limit']);
              const t3Max = getVal(row, ['3.Fiyat Üst Limit', '3. Fiyat Üst Limit']);
              const t3Comm = getVal(row, ['3.KOMİSYON', '3. Komisyon']);
              const t3 = createTier(3, t3Min, t3Max || t2Min, t3Comm); if (t3) tiers.push(t3);
              const t4Max = getVal(row, ['4.Fiyat Üst Limit', '4. Fiyat Üst Limit']);
              const t4Comm = getVal(row, ['4.KOMİSYON', '4. Komisyon']);
              const t4 = createTier(4, 0, t4Max || t3Min, t4Comm); if (t4) tiers.push(t4);
              return {
                  id: `row-${index}`, barcode, name: String(row['ÜRÜN İSMİ'] || row['ÜRÜN ADI'] || 'Bilinmeyen Ürün'),
                  modelCode: String(row['MODEL KODU'] || '-'), category: String(row['KATEGORİ'] || '-'),
                  brand: String(row['MARKA'] || '-'), stock: getVal(row, ['STOK']),
                  currentPrice: getVal(row, ['GÜNCEL TSF', 'GÜNCEL SATIŞ FİYATI']), tiers, isMatched: !!matchedProduct,
                  dbCost: cost, dbDesi: desi, shippingCost: shipping, image: productImg,
                  manualPrice: '', manualProfit: null, manualMargin: null, manualCommission: null, selection: null, rawRowData: row
              };
          });
          setProducts(parsedProducts.filter(p => p.barcode));
      } catch (error) { alert("Dosya okunamadı."); } finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleAdvantageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return; setAdvantageFileName(file.name);
      try {
          const buffer = await file.arrayBuffer();
          const workbook = read(buffer);
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = utils.sheet_to_json<any>(sheet, { defval: "" });
          const parsedProducts: AdvantageProduct[] = jsonData.map((row, index) => {
              const barcode = String(row['BARKOD'] || '').trim();
              const matchedProduct = dbProducts.find(p => p.barcode === barcode);
              const tariffMatch = products.find(p => p.barcode === barcode);
              const cost = matchedProduct ? matchedProduct.cost : 0;
              const desi = matchedProduct ? (matchedProduct.desi || 1) : 1;
              const shipping = getShippingCost(desi);
              const productImg = matchedProduct?.images?.[0]?.data;
              const rowCommission = getVal(row, ['KOMİSYON', 'KOMISYON', 'KOMİSYON ORANI', 'GÜNCEL KOMİSYON']);
              const baseCommissionRate = rowCommission > 0 ? rowCommission : 19;
              const stars: StarData[] = [];
              const createStar = (level: 1 | 2 | 3, minKeys: string[], maxKeys: string[]) => {
                  const min = getVal(row, minKeys); const max = getVal(row, maxKeys);
                  if (min === 0 && max === 0) return null;
                  const target = max > 0 ? max : min;
                  let effectiveCommission = baseCommissionRate;
                  if (tariffMatch && tariffMatch.tiers.length > 0) {
                      const matchedTier = tariffMatch.tiers.find(t => target >= t.minPrice && (t.maxPrice === Infinity || target <= t.maxPrice));
                      if (matchedTier) effectiveCommission = matchedTier.commissionRate;
                      else effectiveCommission = 19; 
                  } else { effectiveCommission = rowCommission > 0 ? rowCommission : 19; }
                  const { profit, margin } = calculateProfitInternal(target, cost, shipping, effectiveCommission);
                  return { level, minPrice: min, maxPrice: max, targetPrice: target, commissionUsed: effectiveCommission, estimatedProfit: profit, profitMargin: margin };
              };
              const s1 = createStar(1, ['1 YILDIZ ALT', '1. YILDIZ ALT', '1 YILDIZ ALT FİYAT'], ['1 YILDIZ ÜST', '1. YILDIZ ÜST', '1 YILDIZ ÜST FİYAT']); if (s1) stars.push(s1);
              const s2 = createStar(2, ['2 YILDIZ ALT', '2. YILDIZ ALT', '2 YILDIZ ALT FİYAT'], ['2 YILDIZ ÜST', '2. YILDIZ ÜST', '2 YILDIZ ÜST FİYAT']); if (s2) stars.push(s2);
              const s3 = createStar(3, ['3 YILDIZ ALT', '3. YILDIZ ALT', '3 YILDIZ ALT FİYAT'], ['3 YILDIZ ÜST', '3. YILDIZ ÜST', '3 YILDIZ ÜST FİYAT']); if (s3) stars.push(s3);
              return {
                  id: `adv-row-${index}`, barcode, name: String(row['ÜRÜN İSMİ'] || row['ÜRÜN ADI'] || 'Bilinmeyen Ürün'),
                  modelCode: String(row['MODEL KODU'] || '-'), category: String(row['KATEGORİ'] || '-'),
                  brand: String(row['MARKA'] || '-'), stock: getVal(row, ['STOK']),
                  currentPrice: getVal(row, ['TRENDYOL SATIŞ FİYATI', 'GÜNCEL SATIŞ FİYATI', 'SATIŞ FİYATI']), stars, baseCommissionRate,
                  isMatched: !!matchedProduct, dbCost: cost, dbDesi: desi, shippingCost: shipping, image: productImg,
                  manualPrice: '', manualProfit: null, manualMargin: null, manualCommission: null, selection: null, rawRowData: row
              };
          });
          setAdvantageProducts(parsedProducts.filter(p => p.barcode));
      } catch (error) { alert("Dosya okunamadı. Formatı kontrol edin."); } finally { if (advantageFileInputRef.current) advantageFileInputRef.current.value = ''; }
  };

  const handleManualCalcWrapper = (id: string, val: string, isAdvantage: boolean) => {
      const price = parseFloat(val);
      const updateList = (prev: any[]) => prev.map(p => {
          if (p.id !== id) return p;
          if (isNaN(price)) { return { ...p, manualPrice: val, manualProfit: null, manualMargin: null, manualCommission: null }; }
          let comm = 19;
          if (isAdvantage) {
              comm = p.baseCommissionRate;
              const tariffMatch = products.find(tp => tp.barcode === p.barcode);
              if (tariffMatch && tariffMatch.tiers.length > 0) {
                  const matchedTier = tariffMatch.tiers.find(t => price >= t.minPrice && (t.maxPrice === Infinity || price <= t.maxPrice));
                  if (matchedTier) comm = matchedTier.commissionRate;
              } else { if (comm <= 0) comm = 19; }
          } else {
              const matched = p.tiers.find((t:any) => price >= t.minPrice && (t.maxPrice === Infinity || price <= t.maxPrice));
              if (matched) comm = matched.commissionRate;
              else if (p.tiers.length > 0) comm = p.tiers[0].commissionRate;
              else comm = 20;
          }
          const { profit, margin } = calculateProfitInternal(price, p.dbCost, p.shippingCost, comm);
          return { ...p, manualPrice: val, manualProfit: profit, manualMargin: margin, manualCommission: comm };
      });
      if (!isAdvantage) { setProducts(prev => updateList(prev)); } else { setAdvantageProducts(prev => updateList(prev)); }
  };

  const handleSelectWrapper = (prodId: string, type: any, id: any, price: number, comm: number, isAdvantage: boolean) => {
      if (!isAdvantage) {
          setProducts(prev => prev.map(p => {
              if (p.id !== prodId) return p;
              if (p.selection && p.selection.type === type && p.selection.id === id) return { ...p, selection: null };
              return { ...p, selection: { type, id, price, commission: comm } };
          }));
      } else {
          setAdvantageProducts(prev => prev.map(p => {
              if (p.id !== prodId) return p;
              if (p.selection && p.selection.type === type && p.selection.id === id) return { ...p, selection: null };
              return { ...p, selection: { type, id, price, commission: comm } };
          }));
      }
  };

  // --- SAVE ANALYZE TO SYSTEM (EXTENDED) ---
  const handleSaveToSystem = () => {
    if (!dateRange.start || !dateRange.end) {
        alert("Lütfen önce geçerli bir tarih aralığı belirleyin.");
        return;
    }

    const isTariff = activeTab === 'commission_tariff';
    const sourceList = isTariff ? products : advantageProducts;

    // Satış ekranında dinamik hesaplama için tüm veriyi gönderiyoruz
    const analyzedProducts = sourceList.map(p => ({
        barcode: p.barcode,
        baseCommission: isTariff ? undefined : (p as any).baseCommissionRate,
        tiers: isTariff ? (p as any).tiers.map((t:any) => ({ minPrice: t.minPrice, maxPrice: t.maxPrice, commissionRate: t.commissionRate })) : undefined,
        stars: !isTariff ? (p as any).stars.map((s:any) => ({ level: s.level, minPrice: s.minPrice, maxPrice: s.maxPrice, targetPrice: s.targetPrice, commissionUsed: s.commissionUsed })) : undefined
    }));

    if (analyzedProducts.length === 0) {
        alert("Lütfen önce bir dosya yükleyin.");
        return;
    }

    setIsSaving(true);
    const newRecord: TrendyolAnalysisRecord = {
        id: generateId(),
        startDate: dateRange.start,
        endDate: dateRange.end,
        analysisDate: new Date().toISOString(),
        type: activeTab,
        products: analyzedProducts
    };

    saveTrendyolAnalysis(newRecord);
    
    setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleExportTrendyolExcel = () => {
      if (products.length === 0) return;
      const exportData = products.map(p => {
          const row = { ...p.rawRowData };
          if (p.selection) { row["YENİ SATIŞ FİYATI"] = p.selection.price; row["KOMİSYON ORANI"] = p.selection.commission; }
          return row;
      });
      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new(); utils.book_append_sheet(wb, ws, "Fiyat Analizi");
      writeFile(wb, `Trendyol_Komisyon_Analizi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportAdvantage = () => {
      if (advantageProducts.length === 0) return;
      const exportData = advantageProducts.map(p => {
          const row = { ...p.rawRowData };
          if (p.selection) { row["YENİ TSF (FİYAT GÜNCELLE)"] = p.selection.price; row["GÜNCEL KOMİSYON"] = p.selection.commission; }
          return row;
      });
      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new(); utils.book_append_sheet(wb, ws, "Avantajlı Ürünler");
      writeFile(wb, `Trendyol_Avantajli_Urunler_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getFilteredList = (list: any[]) => {
      return list.filter(p => {
          const matchText = p.name.toLowerCase().includes(filters.text.toLowerCase()) || p.barcode.includes(filters.text) || p.modelCode.toLowerCase().includes(filters.text);
          const matchBrand = filters.brand ? p.brand.toLowerCase().includes(filters.brand.toLowerCase()) : true;
          const matchCategory = filters.category ? p.category.toLowerCase().includes(filters.category.toLowerCase()) : true;
          let matchStock = true; if (filters.minStock) matchStock = matchStock && p.stock >= Number(filters.minStock); if (filters.maxStock) matchStock = matchStock && p.stock <= Number(filters.maxStock);
          return matchText && matchBrand && matchCategory && matchStock;
      });
  };

  const currentList = activeTab === 'commission_tariff' ? products : advantageProducts;
  const filteredList = getFilteredList(currentList);
  const SelectionButton = ({ isSelected, onClick, disabled }: { isSelected: boolean, onClick: () => void, disabled?: boolean }) => (
      <button onClick={onClick} disabled={disabled} className={`w-full py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm border flex items-center justify-center gap-1 ${disabled ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60' : isSelected ? 'bg-green-600 border-green-600 text-white hover:bg-green-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700'}`}>
          {isSelected ? <><Check size={12} strokeWidth={3} /> Seçildi</> : 'Seç'}
      </button>
  );
  const filterInputClass = "w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all px-4 py-2.5 shadow-sm placeholder-gray-400 hover:border-blue-300 dark:hover:border-blue-700";
  const manualInputClass = "w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-gray-800 dark:text-white shadow-sm transition-all";

  return (
    <div className="space-y-6 animate-fade-in pb-24">
        <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
                <button onClick={() => setActiveTab('commission_tariff')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'commission_tariff' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'}`}>
                    <Calculator size={18} /> Komisyon Tarifesi
                </button>
                <button onClick={() => setActiveTab('advantage_tag')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'advantage_tag' ? 'border-orange-50 text-orange-600 dark:text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'}`}>
                    <Star size={18} /> Avantajlı Ürün Etiketi
                </button>
            </nav>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Geçerli Tarih Aralığı :</span>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5">
                        <Calendar size={16} className="text-blue-600" />
                        <input type="date" className="bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 w-32" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                        <span className="text-gray-400">-</span>
                        <input type="date" className="bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 w-32" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                    </div>
                </div>
            </div>
            <div className="w-full md:w-auto flex justify-end gap-2">
                <button 
                    onClick={handleSaveToSystem}
                    disabled={isSaving || currentList.length === 0}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm ${saveSuccess ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'}`}
                >
                    {isSaving ? <RefreshCw className="animate-spin" size={20}/> : saveSuccess ? <Check size={20}/> : <Database size={20}/>}
                    {saveSuccess ? 'Analiz Kaydedildi' : 'Tüm Analizi Veritabanına Aktar'}
                </button>
                {activeTab === 'commission_tariff' ? (
                    <>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm">
                            {fileName ? <><FileSpreadsheet size={20} /> {fileName}</> : <><Upload size={20} /> Komisyon Tarifesi Yükle</>}
                        </button>
                    </>
                ) : (
                    <>
                        <input type="file" ref={advantageFileInputRef} onChange={handleAdvantageFileUpload} accept=".xlsx, .xls" className="hidden" />
                        <button onClick={() => advantageFileInputRef.current?.click()} className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm">
                            {advantageFileName ? <><FileSpreadsheet size={20} /> {advantageFileName}</> : <><Upload size={20} /> Avantajlı Ürün Dosyası Yükle</>}
                        </button>
                    </>
                )}
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <input type="text" placeholder="Ürün adı" className={filterInputClass} value={filters.text} onChange={e => setFilters({...filters, text: e.target.value})} />
                <input type="text" placeholder="Barkod" className={filterInputClass} onChange={e => setFilters({...filters, text: e.target.value})} />
                <input type="text" placeholder="Model kodu" className={filterInputClass} onChange={e => setFilters({...filters, text: e.target.value})} />
                <div className="flex gap-2">
                    <input type="number" placeholder="Min stok" className={filterInputClass} value={filters.minStock} onChange={e => setFilters({...filters, minStock: e.target.value})} />
                    <span className="self-center text-gray-400">-</span>
                    <input type="number" placeholder="Max stok" className={filterInputClass} value={filters.maxStock} onChange={e => setFilters({...filters, maxStock: e.target.value})} />
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-t-xl border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shadow-sm">
            <span className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
               {activeTab === 'commission_tariff' ? <Calculator className="text-blue-600"/> : <Star className="text-orange-500"/>}
               {activeTab === 'commission_tariff' ? 'Ürün Komisyon Tarifesi Kârlılık Analizi' : 'Avantajlı Ürün Etiketi Kârlılık Analizi'}
            </span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-b-xl shadow-sm border-x border-b border-gray-200 dark:border-gray-700">
            {activeTab === 'commission_tariff' ? (
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/10">
                    <div className="col-span-1">Varyantlar</div>
                    <div className="col-span-3">Ürün</div>
                    <div className="col-span-1 text-center">Stok / Maliyet</div>
                    <div className="col-span-1 text-center">Güncel Fiyat</div>
                    <div className="col-span-1 text-center">1. Fiyat Aralığı</div>
                    <div className="col-span-1 text-center">2. Fiyat Aralığı</div>
                    <div className="col-span-1 text-center">3. Fiyat Aralığı</div>
                    <div className="col-span-1 text-center">4. Fiyat Aralığı</div>
                    <div className="col-span-2 text-center">Manuel Fiyat (Simülasyon)</div>
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/10">
                    <div className="col-span-1">Varyantlar</div>
                    <div className="col-span-2">Ürün</div>
                    <div className="col-span-1 text-center">Stok / Maliyet / Kargo</div>
                    <div className="col-span-1 text-center">Güncel Fiyat (₺)</div>
                    <div className="col-span-2 text-center">Avantaj Fiyat Aralığı (1 Yıldız)</div>
                    <div className="col-span-2 text-center">Çok Avantaj Fiyat Aralığı (2 Yıldız)</div>
                    <div className="col-span-2 text-center">Süper Avantaj Fiyat Aralığı (3 Yıldız)</div>
                    <div className="col-span-1 text-center">Manuel Fiyat Girişi</div>
                </div>
            )}

            {filteredList.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredList.map((product: any) => {
                        const isAdvantage = activeTab === 'advantage_tag';
                        return (
                        <div key={product.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                            <div className="col-span-1 flex flex-col items-center justify-center text-[10px] text-gray-500 font-bold border border-gray-200 rounded p-1 h-full text-center bg-gray-50 dark:bg-gray-800">
                                <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center mb-1 text-xs">{isAdvantage ? '5' : '1'}</span>
                                Varyantları<br/>Düzenle
                            </div>
                            <div className={`${isAdvantage ? 'col-span-2' : 'col-span-3'} flex gap-3`}>
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-md shrink-0 overflow-hidden relative border border-gray-200 dark:border-gray-600 flex items-center justify-center group">
                                    {product.image ? ( <img src={product.image} alt="Product" className="w-full h-full object-cover transition-transform group-hover:scale-110" /> ) : ( <ImageIcon className="text-gray-400" size={24} /> )}
                                    {!product.isMatched && ( <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1 text-center backdrop-blur-[1px]"><span className="text-[9px] text-white font-bold leading-tight">Maliyet<br/>Yok</span></div> )}
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 underline decoration-blue-400 decoration-2 underline-offset-2 mb-1 line-clamp-2">{product.name}</h4>
                                    <p className="text-[10px] text-gray-500">Barkod: {product.barcode}</p>
                                    <p className="text-[10px] text-gray-500">Kategori: {product.category}</p>
                                    <p className="text-[10px] text-gray-500">Model: {product.modelCode}</p>
                                </div>
                            </div>
                            <div className="col-span-1 text-center">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{product.stock} Adet</div>
                                {product.isMatched ? ( <div className="text-[10px] text-gray-500 mt-1">Maliyet: <span className="font-bold">₺{product.dbCost}</span><br/>Kargo: <span className="font-bold">₺{product.shippingCost}</span><br/><span className="text-[9px] opacity-70">({product.dbDesi} Desi)</span></div> ) : ( <div className="text-[10px] text-gray-400 mt-1">-</div> )}
                            </div>
                            {!isAdvantage ? (
                                <>
                                    <div className="col-span-1 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">₺{product.currentPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</div>
                                    {[1, 2, 3, 4].map(tierId => {
                                        const tier = product.tiers.find((t:any) => t.id === tierId);
                                        const isSelected = product.selection?.type === 'tier' && product.selection?.id === tierId;
                                        if (!tier) return <div key={tierId} className="col-span-1 border-l border-gray-100 h-full"></div>;
                                        const isProfitable = tier.estimatedProfit > 0;
                                        const pillColor = !product.isMatched ? 'bg-gray-100 text-gray-500' : (isProfitable ? 'bg-green-500 text-white' : 'bg-red-500 text-white');
                                        return (
                                            <div key={tierId} className={`col-span-1 flex flex-col items-center justify-between p-1 border-l border-gray-100 dark:border-gray-700 h-full rounded ${isSelected ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
                                                <div className="text-center w-full">
                                                    <div className="text-[10px] font-bold mb-1">{tierId===1?`₺${tier.minPrice}+`:tierId===4?`₺${tier.maxPrice}-`:`₺${tier.minPrice}-₺${tier.maxPrice}`}</div>
                                                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-0.5">Komisyon: %{tier.commissionRate}</div>
                                                    <div className="text-[9px] text-gray-500 mb-0.5">Baz: <b>₺{tier.referencePriceUsed}</b></div>
                                                    <div className={`${pillColor} text-[9px] px-1 py-0.5 rounded font-bold mb-1 w-full text-center leading-tight`}>{product.isMatched ? <>₺{tier.estimatedProfit.toFixed(0)} Kâr (%{tier.profitMargin.toFixed(0)})</> : 'Maliyet?'}</div>
                                                </div>
                                                <SelectionButton isSelected={isSelected} onClick={() => handleSelectWrapper(product.id, 'tier', tier.id, tier.referencePriceUsed, tier.commissionRate, false)} />
                                            </div>
                                        );
                                    })}
                                    <div className="col-span-2 pl-2 border-l border-gray-100 dark:border-gray-700 flex flex-col justify-between h-full py-1">
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <input type="text" placeholder="Fiyat" className={manualInputClass} value={product.manualPrice} onChange={e => handleManualCalcWrapper(product.id, e.target.value, false)} />
                                                <button onClick={() => handleManualCalcWrapper(product.id, product.manualPrice, false)} className="bg-gray-800 dark:bg-gray-700 text-white p-1.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"><Calculator size={12}/></button>
                                            </div>
                                            {product.manualProfit !== null && ( <div className={`text-[10px] text-center rounded font-bold mb-2 ${product.manualProfit>0?'text-green-600':'text-red-600'}`}>₺{product.manualProfit.toFixed(2)} (%{product.manualMargin?.toFixed(0)})</div> )}
                                        </div>
                                        <SelectionButton isSelected={product.selection?.type === 'manual' && product.selection?.id === 'manual'} disabled={!product.manualPrice || isNaN(parseFloat(product.manualPrice))} onClick={() => { const price = parseFloat(product.manualPrice); const comm = product.manualCommission || 20; if (!isNaN(price)) { handleSelectWrapper(product.id, 'manual', 'manual', price, comm, false); } }} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="col-span-1 text-center font-bold text-orange-600 dark:text-orange-400 text-sm">₺{product.currentPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</div>
                                    {[1, 2, 3].map(level => {
                                        const star = product.stars?.find((s:any) => s.level === level);
                                        const isSelected = product.selection?.type === 'star' && product.selection?.id === level;
                                        if (!star) return ( <div key={level} className="col-span-2 flex flex-col items-center justify-center border-l border-gray-100 dark:border-gray-700 h-full bg-gray-50/50 dark:bg-gray-800/20 rounded"><span className="text-[10px] text-gray-400">Veri Yok</span></div> );
                                        const isProfitable = star.estimatedProfit > 0;
                                        const badgeColor = isProfitable ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200';
                                        return (
                                            <div key={level} className={`col-span-2 flex flex-col items-center justify-between p-2 border-l border-gray-100 dark:border-gray-700 h-full rounded transition-all ${isSelected ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                                <div className="w-full text-center">
                                                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">₺{star.minPrice.toLocaleString('tr-TR')} - <span className="text-red-500">₺{star.maxPrice.toLocaleString('tr-TR')}</span></div>
                                                    <div className="text-[10px] text-gray-500 mb-1">Komisyon: %{star.commissionUsed}</div>
                                                    {product.isMatched ? ( <div className={`text-[10px] px-2 py-1 rounded-full border ${badgeColor} font-bold flex flex-col items-center shadow-sm`}><span>₺{star.estimatedProfit.toFixed(2)} Kâr</span><span className="text-[9px] opacity-80">(%{star.profitMargin.toFixed(1)})</span></div> ) : ( <div className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded">Maliyet Girilmedi</div> )}
                                                </div>
                                                <SelectionButton isSelected={isSelected} onClick={() => handleSelectWrapper(product.id, 'star', level, star.targetPrice, star.commissionUsed, true)} />
                                            </div>
                                        );
                                    })}
                                    <div className="col-span-1 pl-2 border-l border-gray-100 dark:border-gray-700 flex flex-col justify-between h-full p-2">
                                        <div className="w-full flex flex-col items-center">
                                            <div className="flex gap-1 mb-1 w-full">
                                                <input type="text" placeholder="Fiyat" className={manualInputClass} value={product.manualPrice} onChange={e => handleManualCalcWrapper(product.id, e.target.value, true)} />
                                                <button onClick={() => handleManualCalcWrapper(product.id, product.manualPrice, true)} className="bg-black dark:bg-gray-700 text-white p-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"><Calculator size={12}/></button>
                                            </div>
                                            {product.manualProfit !== null && product.isMatched && ( <div className={`text-[9px] px-2 py-0.5 rounded font-bold mb-2 ${product.manualProfit > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>₺{product.manualProfit.toFixed(0)} (%{product.manualMargin?.toFixed(0)})</div> )}
                                        </div>
                                        <SelectionButton isSelected={product.selection?.type === 'manual' && product.selection?.id === 'manual'} disabled={!product.manualPrice || isNaN(parseFloat(product.manualPrice))} onClick={() => { const price = parseFloat(product.manualPrice); const comm = product.manualCommission || 20; if (!isNaN(price)) { handleSelectWrapper(product.id, 'manual', 'manual', price, comm, true); } }} />
                                    </div>
                                </>
                            )}
                        </div>
                    )})}
                </div>
            ) : (
                 <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                    <Search size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                    <p className="text-lg font-medium">Sonuç bulunamadı.</p>
                    <p className="text-sm">Arama kriterlerinizi değiştirerek tekrar deneyiniz.</p>
                </div>
            )}
        </div>

        <div className="flex justify-end gap-3">
             {activeTab === 'commission_tariff' ? (
                 <button onClick={handleExportTrendyolExcel} disabled={products.length === 0} className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-lg font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50">
                     <Download size={20} /> Excel İndir
                 </button>
             ) : (
                 <button onClick={handleExportAdvantage} disabled={advantageProducts.length === 0} className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-lg font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50">
                     <Download size={20} /> Avantaj Raporu İndir
                 </button>
             )}
        </div>
    </div>
  );
};

export default TrendyolAnalysis;
