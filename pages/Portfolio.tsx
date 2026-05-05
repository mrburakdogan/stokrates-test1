
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Plus, Trash2, Search, TrendingUp, TrendingDown, Wallet, X, DollarSign, LineChart, RefreshCw, BarChart2, Coins, ArrowUpRight, ArrowDownLeft, Info, Briefcase, Globe, AlertCircle, PieChart as PieChartIcon, ListPlus, History, Maximize2, Circle, Clock, ArrowRightLeft, CreditCard, ChevronRight, Banknote, Download, Upload, CalendarClock, AlertTriangle, ExternalLink, Loader2, Check } from 'lucide-react';
import { deleteAsset, generateId, getAssets, saveAsset, getDebtCredits, getAssetTransactions, saveInvestmentCash, getInvestmentCash, saveAssetTransaction } from '../services/db';
import { Asset, AssetTransaction, DebtCredit } from '../types';
import { GoogleGenAI } from '@google/genai';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Cell as BarCell 
} from 'recharts';

const ASSET_TYPES = [
    { value: 'stock', label: 'Hisse Senedi', icon: <LineChart size={14}/> },
    { value: 'crypto', label: 'Kripto Para', icon: <Coins size={14}/> },
    { value: 'commodity', label: 'Altın / Emtia', icon: <Briefcase size={14}/> },
    { value: 'currency', label: 'Döviz', icon: <Globe size={14}/> },
    { value: 'cash', label: 'Nakit (TL/USD/EUR)', icon: <Banknote size={14}/> }
];

const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const getTPlusTwoDate = (startDate = new Date()) => {
    let d = new Date(startDate);
    let added = 0;
    while (added < 2) {
        d.setDate(d.getDate() + 1);
        const day = d.getDay(); 
        if (day !== 0 && day !== 6) {
            added++;
        }
    }
    return d.toISOString().split('T')[0];
};

const TradingViewWidget: React.FC<{ symbol: string }> = ({ symbol }) => {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;
        container.current.innerHTML = '';
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        
        let finalSymbol = symbol;
        // BIST sembollerini grafik için uygun formata getir
        if (!symbol.includes(':') && symbol.length <= 5) {
            finalSymbol = `BIST:${symbol}`;
        }

        script.innerHTML = JSON.stringify({
            "symbol": finalSymbol,
            "width": "100%",
            "height": "100%",
            "locale": "tr",
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "light",
            "style": "1",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "allow_symbol_change": true,
            "container_id": "tradingview_chart"
        });
        container.current.appendChild(script);
    }, [symbol]);

    return (
        <div className="h-full w-full" ref={container}>
            <div id="tradingview_chart" className="h-full w-full"></div>
        </div>
    );
};

const Portfolio: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
  const [pendingDebtCredits, setPendingDebtCredits] = useState<DebtCredit[]>([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'buy' | 'sell'>('buy');
  const [cashModalTab, setCashModalTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Added searchSources state to follow Gemini Search Grounding guidelines
  const [searchSources, setSearchSources] = useState<{title: string, uri: string}[]>([]);
  
  // TradingView Search State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingSymbols, setIsSearchingSymbols] = useState(false);
  const searchAbortController = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    type: 'stock' as Asset['type'],
    quantity: '',
    price: '',
    settlementDate: ''
  });

  const [cashFormData, setCashFormData] = useState({
      amount: '',
      description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // TradingView Arama Tetikleyici
  useEffect(() => {
    if (formData.symbol.length >= 2 && isModalOpen) {
        const timer = setTimeout(() => {
            searchTradingViewSymbols(formData.symbol);
        }, 400);
        return () => clearTimeout(timer);
    } else {
        setSearchResults([]);
    }
  }, [formData.symbol, isModalOpen]);

  const loadData = () => {
    setAssets(getAssets());
    setTransactions(getAssetTransactions());
    setCashBalance(getInvestmentCash());
    setPendingDebtCredits(getDebtCredits().filter(i => !i.isCompleted));
  };

  const searchTradingViewSymbols = async (query: string) => {
      if (searchAbortController.current) searchAbortController.current.abort();
      searchAbortController.current = new AbortController();

      setIsSearchingSymbols(true);
      try {
          const response = await fetch('/.netlify/functions/proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: searchAbortController.current.signal,
              body: JSON.stringify({
                  url: `https://symbol-search.tradingview.com/symbol_search/v1/?text=${encodeURIComponent(query)}&hl=1&lang=tr&type=&exchange=`,
                  options: { method: 'GET' }
              })
          });

          if (response.ok) {
              const data = await response.json();
              setSearchResults(data.symbols || []);
          }
      } catch (err: any) {
          if (err.name !== 'AbortError') console.error("TradingView search failed", err);
      } finally {
          setIsSearchingSymbols(false);
      }
  };

  const refreshPrices = async () => {
    const currentAssets = getAssets();
    const assetsToUpdate = currentAssets.filter(a => a.type !== 'cash' && a.quantity > 0);
    if (assetsToUpdate.length === 0 || isLoadingPrices) return;

    setIsLoadingPrices(true);
    try {
        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        const symbolsList = assetsToUpdate.map(a => `${a.symbol} (${a.type})`).join(', ');
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Aşağıdaki varlıkların TÜRK LİRASI (TRY) cinsinden güncel canlı piyasa fiyatlarını bul: ${symbolsList}. 
                      Lütfen Google Arama sonuçlarını kullanarak en doğru veriyi getir. 
                      Yanıtı SADECE geçerli bir JSON dizisi olarak ver: [{"symbol": "THYAO", "price": 285.50}, ...].`,
            config: { 
                tools: [{ googleSearch: {} }], 
                // Removed responseMimeType for safer search grounding handling as per guidelines
            }
        });

        // Extract text safely
        let text = response.text || '';
        
        // Extract search sources as required by Gemini Search Grounding guidelines
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            const sources = chunks
                .map((chunk: any) => chunk.web)
                .filter((web: any) => web && web.uri && web.title);
            setSearchSources(sources);
        }

        try {
            // Clean markdown if model returned it despite prompt
            const jsonStr = text.includes('```json') ? text.split('```json')[1].split('```')[0] : text;
            const updatedData = JSON.parse(jsonStr);
            const nextAssets = currentAssets.map(asset => {
                const match = updatedData.find((d: any) => 
                    String(d.symbol).toUpperCase().includes(asset.symbol.toUpperCase()) || 
                    asset.symbol.toUpperCase().includes(String(d.symbol).toUpperCase())
                );
                
                if (match && !isNaN(parseFloat(match.price))) {
                    return { ...asset, currentPrice: parseFloat(match.price), updatedAt: new Date().toISOString() };
                }
                return asset;
            });
            
            nextAssets.forEach(saveAsset);
            setAssets(nextAssets);
            setLastUpdate(new Date());
        } catch (e) {
            console.warn("Price parse error", text);
        }
    } catch (error) {
        console.error("Price refresh failed", error);
    } finally {
        setIsLoadingPrices(false);
    }
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const symbolUpper = formData.symbol.trim().toUpperCase();
    if (!symbolUpper) return;

    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price) || 0;
    const total = qty * price;
    
    if (qty <= 0) {
        alert("Lütfen geçerli bir miktar giriniz.");
        return;
    }

    const existingAsset = assets.find(a => a.symbol === symbolUpper);
    
    if (modalTab === 'buy') {
        if (cashBalance < total) {
            if(!window.confirm('Kasa bakiyeniz yetersiz. Yine de devam etmek istiyor musunuz?')) return;
        }

        let assetToSave: Asset;
        if (existingAsset) {
            const newTotalQty = existingAsset.quantity + qty;
            const newAvgCost = ((existingAsset.quantity * existingAsset.purchasePrice) + total) / newTotalQty;
            assetToSave = { ...existingAsset, quantity: newTotalQty, purchasePrice: newAvgCost, updatedAt: new Date().toISOString() };
        } else {
            assetToSave = { id: generateId(), symbol: symbolUpper, name: formData.name || symbolUpper, type: formData.type, quantity: qty, purchasePrice: price, currentPrice: price, updatedAt: new Date().toISOString() };
        }
        
        saveAsset(assetToSave);
        saveAssetTransaction({
            id: generateId(), assetId: assetToSave.id, symbol: symbolUpper, type: 'buy', quantity: qty, price: price, total: total, date: new Date().toISOString()
        });

    } else {
        if (!existingAsset || existingAsset.quantity < qty) {
            alert('Yetersiz adet!');
            return;
        }

        const settlementDate = formData.settlementDate || (formData.type === 'stock' ? getTPlusTwoDate() : new Date().toISOString().split('T')[0]);
        const realizedProfit = (price - existingAsset.purchasePrice) * qty;
        const newTotalQty = existingAsset.quantity - qty;
        
        const updatedAsset: Asset = { ...existingAsset, quantity: newTotalQty, updatedAt: new Date().toISOString() };
        saveAsset(updatedAsset);
        
        saveAssetTransaction({
            id: generateId(), assetId: existingAsset.id, symbol: symbolUpper, type: 'sell', quantity: qty, price: price, total: total, date: settlementDate, realizedProfit: realizedProfit
        });
    }

    loadData();
    handleCloseModal();
  };

  const handleCashActionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(cashFormData.amount) || 0;
      if (amount <= 0) return;
      saveAssetTransaction({
          id: generateId(), assetId: 'cash-system', symbol: 'KASA', type: cashModalTab, quantity: 1, price: amount, total: amount, date: new Date().toISOString()
      });
      loadData();
      setIsCashModalOpen(false);
      setCashFormData({ amount: '', description: '' });
  };

  const handleSelectSymbol = (res: any) => {
      let type: Asset['type'] = 'stock';
      const tvType = (res.type || '').toLowerCase();
      const exchange = (res.exchange || '').toLowerCase();

      if (tvType === 'crypto' || exchange === 'binance' || exchange === 'btcturk') type = 'crypto';
      else if (exchange === 'bist' || exchange === 'borsa istanbul') type = 'stock';
      else if (tvType === 'forex' || tvType === 'currency' || exchange === 'fx') type = 'currency';
      else if (tvType === 'commodity' || exchange === 'ice' || exchange === 'comex') type = 'commodity';

      setFormData({
          ...formData,
          symbol: res.symbol,
          name: res.description,
          type: type
      });
      setSearchResults([]);
  };

  const handleOpenChart = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsChartModalOpen(true);
  };

  const handleQuickAdd = (asset: Asset, type: 'buy' | 'sell') => {
    setModalTab(type);
    setFormData({
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      quantity: '',
      price: asset.currentPrice.toString(),
      settlementDate: type === 'sell' && asset.type === 'stock' ? getTPlusTwoDate() : ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Fixed: Removed undefined setEditingId call
    setFormData({ symbol: '', name: '', type: 'stock', quantity: '', price: '', settlementDate: '' });
    setSearchResults([]);
    if (searchAbortController.current) searchAbortController.current.abort();
  };

  const distributionData = useMemo(() => {
      return assets.filter(a => a.quantity > 0).map(a => ({
          name: a.symbol,
          value: a.currentPrice * a.quantity
      })).sort((a, b) => b.value - a.value);
  }, [assets]);

  const performanceData = useMemo(() => {
      return assets.filter(a => a.quantity > 0 && a.type !== 'cash').map(a => {
          const profitPercent = ((a.currentPrice - a.purchasePrice) / a.purchasePrice) * 100;
          return { name: a.symbol, oran: parseFloat(profitPercent.toFixed(2)) };
      }).sort((a, b) => b.oran - a.oran);
  }, [assets]);

  const activeAssets = assets.filter(a => a.quantity > 0);
  const totalPortfolioValue = activeAssets.reduce((sum, a) => sum + (a.currentPrice * a.quantity), 0);
  const totalUnrealizedProfit = activeAssets.reduce((sum, a) => {
      if (a.type === 'cash') return sum;
      return sum + ((a.currentPrice - a.purchasePrice) * a.quantity);
  }, 0);
  const totalRealizedProfit = transactions.reduce((sum, tx) => sum + (tx.realizedProfit || 0), 0);
  
  const totalDebts = getDebtCredits().filter(d => d.type === 'debt' && !d.isCompleted).reduce((s, c) => s + c.amount, 0);
  const totalCredits = getDebtCredits().filter(d => d.type === 'credit' && !d.isCompleted).reduce((s, c) => s + c.amount, 0);
  const netWealth = totalPortfolioValue + cashBalance + totalCredits - totalDebts;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Briefcase className="text-indigo-600" /> Portföy & Varlık Yönetimi
            </h1>
            <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-800">
                    <span className={`w-2 h-2 rounded-full bg-green-500 ${isLoadingPrices ? 'animate-ping' : 'animate-pulse'}`}></span>
                    <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase">
                        {isLoadingPrices ? 'Fiyatlar Güncelleniyor...' : 'Canlı Veri Takibi'}
                    </span>
                </div>
                <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                    <Clock size={12} /> {lastUpdate ? lastUpdate.toLocaleTimeString('tr-TR') : 'Bekliyor...'}
                </span>
                <button onClick={refreshPrices} disabled={isLoadingPrices} className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-50">
                    <RefreshCw size={14} className={isLoadingPrices ? 'animate-spin' : ''} />
                </button>
                {/* Search Sources Display to follow guidelines */}
                {searchSources.length > 0 && (
                    <div className="hidden lg:flex items-center gap-2 ml-4 px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Kaynaklar:</span>
                        <div className="flex gap-2 max-w-[300px] overflow-x-auto no-scrollbar">
                            {searchSources.map((source, idx) => (
                                <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline whitespace-nowrap" title={source.title}>
                                    {source.title.substring(0, 15)}...
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        <button onClick={() => { setModalTab('buy'); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
            <Plus size={20} /> Varlık Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mevcut Varlık Değeri</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">₺{totalPortfolioValue.toLocaleString('tr-TR')}</p>
              <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${totalUnrealizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalUnrealizedProfit >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                  ₺{totalUnrealizedProfit.toLocaleString('tr-TR')} (Kâr/Zarar)
              </div>
          </div>
          
          <div onClick={() => setIsCashModalOpen(true)} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-indigo-300 transition-all">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kasa Bakiyesi (Nakit)</p>
              <p className="text-2xl font-black text-blue-600">₺{cashBalance.toLocaleString('tr-TR')}</p>
              <p className="text-[10px] text-indigo-500 mt-2 font-bold flex items-center gap-1"><ArrowRightLeft size={12}/> Para Yatır/Çek</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gerçekleşen Yatırım Karı</p>
              <p className={`text-2xl font-black ${totalRealizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₺{totalRealizedProfit.toLocaleString('tr-TR')}
              </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white shadow-xl flex flex-col justify-center">
                <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Toplam Mal Varlığı</p>
                <p className="text-3xl font-black tracking-tight">₺{netWealth.toLocaleString('tr-TR')}</p>
                <p className="text-[9px] font-bold opacity-80 mt-2 uppercase">Varlıklar + Kasa + Alacak - Borç</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center">
                      <Search className="text-gray-400 mr-2" size={18} />
                      <input type="text" placeholder="Sembol veya isim ara..." className="bg-transparent border-none outline-none text-sm w-full font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <tr>
                                  <th className="px-6 py-4">Varlık</th>
                                  <th className="px-6 py-4 text-center">Miktar</th>
                                  <th className="px-6 py-4">Maliyet</th>
                                  <th className="px-6 py-4">Piyasa Değeri</th>
                                  <th className="px-6 py-4 text-right">İşlem</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {activeAssets.filter(a => a.symbol.includes(searchTerm.toUpperCase()) || a.name.toLowerCase().includes(searchTerm.toLowerCase())).map(asset => {
                                  const assetProfit = (asset.currentPrice - asset.purchasePrice) * asset.quantity;
                                  const assetProfitPercent = (assetProfit / (asset.purchasePrice * asset.quantity)) * 100;
                                  const isCash = asset.type === 'cash';
                                  return (
                                      <tr key={asset.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                                          <td className="px-6 py-4">
                                              <div className="flex items-center gap-3">
                                                  <div className={`p-2 rounded-xl ${isCash ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                                      {ASSET_TYPES.find(t => t.value === asset.type)?.icon}
                                                  </div>
                                                  <div onClick={() => !isCash && handleOpenChart(asset)} className={`${isCash ? 'cursor-default' : 'cursor-pointer hover:text-indigo-600'}`}>
                                                      <div className="font-black text-gray-800 dark:text-white text-sm flex items-center gap-1.5 uppercase">
                                                          {asset.symbol}
                                                          {!isCash && <Maximize2 size={12} className="opacity-0 group-hover:opacity-100 text-indigo-500" />}
                                                      </div>
                                                      <div className="text-[10px] text-gray-400 font-bold">{asset.name || 'Açıklama yok'}</div>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-center font-mono font-bold text-xs text-gray-600 dark:text-gray-300">
                                              {asset.quantity.toLocaleString('tr-TR')}
                                          </td>
                                          <td className="px-6 py-4">
                                              {isCash ? '-' : <div className="text-sm font-bold text-gray-800 dark:text-white">₺{asset.purchasePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>}
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="text-sm font-black text-gray-800 dark:text-white">₺{(asset.currentPrice * asset.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                              {!isCash && <div className={`text-[10px] font-black ${assetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>%{assetProfitPercent.toFixed(1)}</div>}
                                          </td>
                                          <td className="px-6 py-4 text-right space-x-1">
                                              <button onClick={() => handleQuickAdd(asset, 'buy')} className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-lg"><TrendingUp size={16}/></button>
                                              <button onClick={() => handleQuickAdd(asset, 'sell')} className="p-2 text-orange-500 hover:bg-orange-100 rounded-lg"><TrendingDown size={16}/></button>
                                              <button onClick={() => { if(window.confirm('Bu varlığı silmek istediğinize emin misiniz?')) { deleteAsset(asset.id); loadData(); } }} className="p-2 text-gray-300 hover:text-red-500 rounded-lg"><Trash2 size={16}/></button>
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 h-[350px]">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4 uppercase tracking-tighter text-sm">
                      <PieChartIcon size={18} className="text-indigo-600" /> Varlık Dağılımı
                  </h3>
                  <div className="h-full">
                      {activeAssets.length > 0 ? (
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" nameKey="name">
                                    {distributionData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(value: number, name: string) => [`₺${value.toLocaleString()}`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                      ) : <div className="h-full flex items-center justify-center text-gray-300">Varlık yok</div>}
                  </div>
              </div>
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 m-4 rounded-2xl">
                <button onClick={() => setModalTab('buy')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${modalTab === 'buy' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500'}`}>VARLIK EKLE</button>
                <button onClick={() => setModalTab('sell')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${modalTab === 'sell' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500'}`}>VARLIK ÇIKAR</button>
            </div>
            <div className="px-6 py-2 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white uppercase">{modalTab === 'buy' ? 'Satın Alım' : 'Satış / Çıkış'}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleTransactionSubmit} className="p-6 space-y-5">
              <div className="relative">
                <label className="block text-xs font-black text-gray-400 uppercase mb-1.5 ml-1">Sembol (Örn: THYAO, BTC-USD)</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                        {isSearchingSymbols ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </div>
                    <input 
                        type="text" required autoFocus
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-700 dark:text-white bg-white dark:bg-gray-700 outline-none uppercase font-bold" 
                        value={formData.symbol} 
                        onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})} 
                    />
                </div>
                {searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {searchResults.map((res, idx) => (
                            <div key={idx} onClick={() => handleSelectSymbol(res)} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer border-b last:border-0 flex justify-between items-center">
                                <div className="flex-1 min-w-0 mr-4">
                                    <div className="font-black text-gray-800 dark:text-white text-xs uppercase">{res.symbol}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{res.description}</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[10px] font-black text-indigo-600 uppercase bg-gray-100 px-1 rounded">{res.exchange}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-1.5 ml-1">Miktar</label>
                    <input type="number" step="any" required className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-white bg-white dark:bg-gray-700 outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-1.5 ml-1">Fiyat (₺)</label>
                    <input type="number" step="any" required className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-white bg-white dark:bg-gray-700 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
              </div>
              {modalTab === 'sell' && formData.type === 'stock' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100">
                    <label className="block text-xs font-black text-blue-600 uppercase mb-2">Valör Tarihi (T+2)</label>
                    <input type="date" className="w-full border rounded-xl px-4 py-2 text-sm bg-white dark:bg-gray-800 outline-none" value={formData.settlementDate} onChange={e => setFormData({...formData, settlementDate: e.target.value})} />
                </div>
              )}
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={handleCloseModal} className="px-5 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">İptal</button>
                <button type="submit" className={`px-8 py-3 rounded-xl text-white font-bold shadow-lg transition-all ${modalTab === 'buy' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'}`}>Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCashModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 m-4 rounded-2xl">
                    <button onClick={() => setCashModalTab('deposit')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${cashModalTab === 'deposit' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500'}`}>PARA EKLE</button>
                    <button onClick={() => setCashModalTab('withdraw')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${cashModalTab === 'withdraw' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}>PARA ÇEK</button>
                </div>
                <form onSubmit={handleCashActionSubmit} className="p-6 space-y-4">
                    <input type="number" step="any" required className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-lg font-black bg-gray-50 dark:bg-gray-900 dark:text-white outline-none" value={cashFormData.amount} onChange={e => setCashFormData({...cashFormData, amount: e.target.value})} placeholder="Tutar (₺)" autoFocus />
                    <input type="text" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 dark:text-white outline-none" value={cashFormData.description} onChange={e => setCashFormData({...cashFormData, description: e.target.value})} placeholder="Açıklama" />
                    <button type="submit" className={`w-full py-3 rounded-xl text-white font-bold shadow-lg ${cashModalTab === 'deposit' ? 'bg-green-600' : 'bg-red-600'}`}>Bakiyeyi Güncelle</button>
                </form>
            </div>
          </div>
      )}

      {isChartModalOpen && selectedAsset && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 md:p-10 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full h-full flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="bg-indigo-600 text-white p-2 rounded-xl"><LineChart size={20} /></div>
                          <div>
                              <h3 className="font-black text-xl text-gray-800 dark:text-white uppercase tracking-tight">{selectedAsset.symbol}</h3>
                              <p className="text-xs text-gray-500 font-bold">{selectedAsset.name}</p>
                          </div>
                      </div>
                      <button onClick={() => setIsChartModalOpen(false)} className="p-2 bg-white dark:bg-gray-700 hover:bg-red-50 text-gray-400 hover:text-red-500 border dark:border-gray-600 rounded-2xl transition-all shadow-sm"><X size={28} /></button>
                  </div>
                  <div className="flex-1 bg-white dark:bg-gray-900 relative">
                      <TradingViewWidget symbol={selectedAsset.symbol} />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Portfolio;
