import React, { useState, useEffect } from 'react';
import { Calculator, Globe, Truck } from 'lucide-react';

const CostCalculator: React.FC = () => {
  const [isExport, setIsExport] = useState(false);
  
  // Initialize with empty strings instead of numbers to show empty inputs
  // Except serviceFee which defaults to 13.90
  const [inputs, setInputs] = useState<{
    cost: string;
    shipping: string;
    commissionRate: string;
    profitMargin: string;
    serviceFee: number | string;
    vatRate: number | string;
    intlFee: string;
  }>({
    cost: '',
    shipping: '',
    commissionRate: '',
    profitMargin: '',
    serviceFee: 13.90, 
    vatRate: 20,
    intlFee: ''
  });

  const [results, setResults] = useState({
    finalPrice: 0,
    netProfit: 0,
    commAmt: 0,
    service: 0,
    stopajAmt: 0,
    shipping: 0,
    netVat: 0,
    vatRefund: 0
  });

  useEffect(() => {
    calculate();
  }, [inputs, isExport]);

  const calculate = () => {
    // Treat empty string as 0 for calculation
    const cost = inputs.cost === '' ? 0 : Number(inputs.cost);
    const shipping = inputs.shipping === '' ? 0 : Number(inputs.shipping);
    const service = isExport ? 0 : (inputs.serviceFee === '' ? 0 : Number(inputs.serviceFee));
    const intl = isExport ? (inputs.intlFee === '' ? 0 : Number(inputs.intlFee)) : 0;
    const commRate = (inputs.commissionRate === '' ? 0 : Number(inputs.commissionRate)) / 100;
    const margin = (inputs.profitMargin === '' ? 0 : Number(inputs.profitMargin)) / 100;
    
    // Logic from provided HTML
    let vatRate = isExport ? 0 : (Number(inputs.vatRate) || 20) / 100;

    const kFactor = vatRate / (1 + vatRate); 
    const stopajRate = 0.044;
    const fixedCost = cost + shipping + service + intl;
    let finalPrice = 0;

    if (!isExport) {
        // Domestic Formula
        // Profit = Price * (1 - kFactor - commRate * (1 + stopajRate) - margin) - fixedCost
        const den = 1 - kFactor - (commRate * (1 + stopajRate)) - margin;
        finalPrice = den > 0 ? fixedCost / den : 0;
    } else {
        // Export Formula
        // Payda: 1 - (Komisyon + Komisyon*Stopaj + KarMarjı)
        finalPrice = fixedCost / (1 - (commRate + commRate * stopajRate + margin));
    }

    const commAmt = finalPrice * commRate;
    const stopajAmt = commAmt * stopajRate;
    const profit = finalPrice * margin;
    
    let netVat = 0;
    let refund = 0;

    if (!isExport) {
        const outVat = finalPrice * kFactor;
        netVat = outVat;
    } else {
        const costVatRate = 0.20; // Assume 20% for cost VAT refund in export
        refund = cost * (costVatRate / (1 + costVatRate));
    }

    setResults({
        finalPrice: Math.max(0, finalPrice), // Prevent negative price display
        netProfit: profit,
        commAmt,
        service,
        stopajAmt,
        shipping,
        netVat,
        vatRefund: refund
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If value is empty string, keep it empty string. Otherwise parse float for state safety if needed,
    // but here we keep as string/number union in state to allow empty input.
    setInputs(prev => ({
        ...prev,
        [name]: value
    }));
  };

  const fmt = (n: number) => '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                    <Calculator className="mr-3 text-blue-600 dark:text-blue-400" />
                    Maliyet Hesaplama
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Trendyol kesinti yapısına tam uyumlu maliyet ve fiyatlandırma.</p>
            </div>
            
            <div className="mt-4 md:mt-0 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg flex items-center cursor-pointer relative w-64 h-12" onClick={() => setIsExport(!isExport)}>
                <div 
                    className={`absolute left-1 top-1 bg-white dark:bg-gray-600 w-[calc(50%-4px)] h-[calc(100%-8px)] rounded-md shadow-sm transition-all duration-300 ease-in-out ${isExport ? 'translate-x-full' : 'translate-x-0'}`}
                ></div>
                <div className={`z-10 flex-1 flex justify-center items-center text-sm font-semibold transition ${!isExport ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    <Truck size={16} className="mr-2" />
                    Yurt İçi
                </div>
                <div className={`z-10 flex-1 flex justify-center items-center text-sm font-semibold transition ${isExport ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    <Globe size={16} className="mr-2" />
                    İhracat
                </div>
            </div>
       </div>

       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-blue-50 dark:border-gray-700 transition-colors">
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Inputs Left Side */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* Ürün Giderleri */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase mb-5 tracking-wider flex items-center">
                            Ürün Giderleri
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Ürün Maliyeti (KDV Dahil)</label>
                                <input 
                                    type="number" 
                                    name="cost"
                                    placeholder="0.00"
                                    value={inputs.cost} 
                                    onChange={handleInputChange} 
                                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Kargo Ücreti</label>
                                <input 
                                    type="number" 
                                    name="shipping"
                                    placeholder="0.00" 
                                    value={inputs.shipping} 
                                    onChange={handleInputChange} 
                                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Platform Oranları */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase mb-5 tracking-wider">
                            {isExport ? 'İhracat Parametreleri' : 'Trendyol Oranları'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Komisyon Oranı (%)</label>
                                <input 
                                    type="number" 
                                    name="commissionRate"
                                    placeholder="%" 
                                    value={inputs.commissionRate} 
                                    onChange={handleInputChange} 
                                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">İstenilen Kâr Marjı (%)</label>
                                <input 
                                    type="number" 
                                    name="profitMargin"
                                    placeholder="%"
                                    value={inputs.profitMargin} 
                                    onChange={handleInputChange} 
                                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" 
                                />
                            </div>
                            
                            {isExport ? (
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Uluslararası Hizmet Bedeli</label>
                                    <input 
                                        type="number" 
                                        name="intlFee"
                                        placeholder="0.00" 
                                        value={inputs.intlFee} 
                                        onChange={handleInputChange} 
                                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" 
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Hizmet Bedeli</label>
                                        <input 
                                            type="number" 
                                            name="serviceFee" 
                                            value={inputs.serviceFee} 
                                            onChange={handleInputChange} 
                                            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">KDV Oranı (%)</label>
                                        <div className="relative">
                                            <select 
                                                name="vatRate" 
                                                value={inputs.vatRate} 
                                                onChange={handleInputChange} 
                                                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none"
                                            >
                                                <option value="20">%20</option>
                                                <option value="10">%10</option>
                                                <option value="1">%1</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results Right Side */}
                <div className="lg:col-span-5 flex flex-col h-full">
                    <div className={`rounded-2xl p-6 text-white shadow-lg mb-6 flex-shrink-0 ${isExport ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-gradient-to-br from-blue-600 to-blue-700'}`}>
                        <h2 className="text-blue-100 text-sm font-medium mb-1">Tavsiye Edilen Satış Fiyatı</h2>
                        <span className="text-4xl sm:text-5xl font-bold tracking-tight">{fmt(results.finalPrice)}</span>
                        <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                            <span className="opacity-90">Net Kâr:</span>
                            <span className="font-bold text-2xl">{fmt(results.netProfit)}</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 flex-1 flex flex-col justify-center space-y-4 text-sm">
                        <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                            <span className="text-gray-600 dark:text-gray-400">Komisyon Tutarı</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{fmt(results.commAmt)}</span>
                        </div>
                        {isExport ? (
                             <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                                <span className="text-gray-600 dark:text-gray-400">Uluslararası Hizmet</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{fmt(results.service)}</span>
                            </div>
                        ) : (
                             <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                                <span className="text-gray-600 dark:text-gray-400">Hizmet Bedeli</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{fmt(results.service)}</span>
                            </div>
                        )}
                       
                        <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                            <span className="text-gray-600 dark:text-gray-400">Stopaj Kesintisi</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{fmt(results.stopajAmt)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                            <span className="text-gray-600 dark:text-gray-400">Kargo Maliyeti</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{fmt(results.shipping)}</span>
                        </div>
                        <div className="flex justify-between pt-2">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {isExport ? "KDV (Muaf)" : "Net Ödenecek KDV"}
                            </span>
                            <span className={`font-bold ${results.netVat < 0 ? 'text-green-600' : 'text-gray-800 dark:text-white'}`}>
                                {fmt(results.netVat)}
                            </span>
                        </div>
                        
                        {isExport && (
                            <div className="mt-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800 flex justify-between items-center text-green-700 dark:text-green-400">
                                <span className="font-medium">KDV İadesi (Tahmini)</span>
                                <span className="font-bold text-lg">{fmt(results.vatRefund)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};

export default CostCalculator;