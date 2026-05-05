
import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Database, AlertTriangle, CheckCircle, RefreshCw, MessageSquare, Plus, Edit2, Trash2, Save, X, Link as LinkIcon, Globe, Key, ShieldCheck, PlayCircle, AlertCircle as AlertIcon, Server, ArrowDownCircle, ShieldAlert, XCircle, Info, Truck, Bell, ToggleLeft, ToggleRight, ListPlus, PackageSearch, Scale, Landmark } from 'lucide-react';
import { exportFullSystemBackup, importFullSystemBackup } from '../services/excel';
import { getTemplates, saveTemplate, deleteTemplate, generateId, getTrendyolConfig, saveTrendyolConfig, getProducts, saveProduct, getSystemLogs, clearSystemLogs, getShippingSettings, saveShippingSettings, getAnnouncementSettings, saveAnnouncementSettings, getPlatforms, savePlatform, deletePlatform } from '../services/db';
import { MessageTemplate, TrendyolConfig, Product, ProductImage, SystemLog, ShippingSettings, AnnouncementSettings, CustomAnnouncement, AnnouncementFrequency, Platform, ShippingCompany } from '../types';
import { fetchTrendyolProducts } from '../services/trendyol';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'backup' | 'messages' | 'integration' | 'logs' | 'shipping' | 'announcements' | 'platforms'>('backup');

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Ayarlar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sistem yedekleme, mesaj şablonları, entegrasyonlar ve duyurular.</p>
        </div>

        {/* Tabs Header */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('backup')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'backup' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Database size={18} />
                Yedek & Veri
            </button>
            <button 
                onClick={() => setActiveTab('platforms')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'platforms' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Globe size={18} />
                Platformlar
            </button>
            <button 
                onClick={() => setActiveTab('announcements')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'announcements' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Bell size={18} />
                Duyuru Ayarları
            </button>
            <button 
                onClick={() => setActiveTab('shipping')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'shipping' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Truck size={18} />
                Kargo Ayarları
            </button>
            <button 
                onClick={() => setActiveTab('messages')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'messages' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <MessageSquare size={18} />
                Mesaj Ayarları
            </button>
            <button 
                onClick={() => setActiveTab('integration')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'integration' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <LinkIcon size={18} />
                Entegrasyonlar
            </button>
            <button 
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-red-600 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <ShieldAlert size={18} />
                Hata Kayıtları
            </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
            {activeTab === 'backup' && <BackupSettings />}
            {activeTab === 'platforms' && <PlatformsSettingsTab />}
            {activeTab === 'announcements' && <AnnouncementSettingsTab />}
            {activeTab === 'shipping' && <ShippingSettingsTab />}
            {activeTab === 'messages' && <MessageSettings />}
            {activeTab === 'integration' && <IntegrationSettings />}
            {activeTab === 'logs' && <LogsSettings />}
        </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const BackupSettings: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    const handleExport = () => {
        exportFullSystemBackup();
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (window.confirm("Bu işlem mevcut tüm verilerin üzerine yazacaktır. Devam etmek istiyor musunuz?")) {
            setImporting(true);
            const result = await importFullSystemBackup(file);
            setImporting(false);
            alert(result.message);
            if (result.success) window.location.reload();
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                    <Database size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Tam Sistem Yedeği</h2>
                    <p className="text-sm text-gray-500">Tüm ürünler, resimler, satışlar ve ayarları içeren JSON yedeği.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={handleExport}
                    className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-blue-200 dark:border-blue-900 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group"
                >
                    <Download size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                        <p className="font-bold text-blue-700 dark:text-blue-400">Verileri Dışarı Aktar</p>
                        <p className="text-xs text-blue-500">Sistemi başka bir cihaza taşımak için indirin.</p>
                    </div>
                </button>

                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-orange-200 dark:border-orange-900 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors group disabled:opacity-50"
                >
                    {importing ? <RefreshCw size={24} className="animate-spin text-orange-500" /> : <Upload size={24} className="text-orange-500 group-hover:scale-110 transition-transform" />}
                    <div className="text-left">
                        <p className="font-bold text-orange-700 dark:text-orange-400">Yedeği Geri Yükle</p>
                        <p className="text-xs text-orange-500">Daha önce aldığınız bir yedeği sisteme yükleyin.</p>
                    </div>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400">
                    <strong>DİKKAT:</strong> Yedeği geri yüklediğinizde mevcut tüm verileriniz silinir ve yedek dosyasındaki veriler yüklenir. Bu işlem geri alınamaz. İşlem sonrası sayfa yenilenecektir.
                </p>
            </div>
        </div>
    );
};

const AnnouncementSettingsTab: React.FC = () => {
    const [settings, setSettings] = useState<AnnouncementSettings>(getAnnouncementSettings());
    const [newAnnouncementText, setNewAnnouncementText] = useState('');
    const [saved, setSaved] = useState(false);

    const handleToggleSystem = () => {
        const next = { ...settings, isEnabled: !settings.isEnabled };
        setSettings(next);
        saveAnnouncementSettings(next);
    };

    const handleSaveGeneral = () => {
        saveAnnouncementSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleAddCustom = () => {
        if (!newAnnouncementText.trim()) return;
        const newAnn: CustomAnnouncement = {
            id: generateId(),
            text: newAnnouncementText,
            isActive: true,
            frequency: 'every_login'
        };
        const next = { ...settings, customAnnouncements: [...settings.customAnnouncements, newAnn] };
        setSettings(next);
        saveAnnouncementSettings(next);
        setNewAnnouncementText('');
    };

    const handleDeleteCustom = (id: string) => {
        const next = { ...settings, customAnnouncements: settings.customAnnouncements.filter(a => a.id !== id) };
        setSettings(next);
        saveAnnouncementSettings(next);
    };

    const handleUpdateCustom = (id: string, updates: Partial<CustomAnnouncement>) => {
        const next = {
            ...settings,
            customAnnouncements: settings.customAnnouncements.map(a => a.id === id ? { ...a, ...updates } : a)
        };
        setSettings(next);
        saveAnnouncementSettings(next);
    };

    const FrequencyOptions = () => (
        <>
            <option value="every_login">Her Girişte</option>
            <option value="once_a_day">Günde Bir Kez</option>
            <option value="once_a_week">Haftada Bir Kez</option>
            <option value="once_a_month">Ayda Bir Kez</option>
        </>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <Bell size={24} className="text-blue-600" />
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Açılır Pencere (Pop-up) Duyuruları</h2>
                            <p className="text-sm text-gray-500">Giriş anında çıkan hatırlatıcıları yönetin.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleToggleSystem}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${settings.isEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}
                    >
                        {settings.isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        {settings.isEnabled ? 'SİSTEM AÇIK' : 'SİSTEM KAPALI'}
                    </button>
                </div>

                <div className={`p-6 space-y-8 transition-opacity ${!settings.isEnabled && 'opacity-50 pointer-events-none'}`}>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Auto Todo Reminder */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-4">
                                    <CheckCircle size={18} /> Görevler
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="showTodo"
                                            className="w-5 h-5 text-blue-600 rounded-lg"
                                            checked={settings.showTodoReminder}
                                            onChange={e => setSettings({...settings, showTodoReminder: e.target.checked})}
                                        />
                                        <label htmlFor="showTodo" className="text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer">Günü gelenleri göster</label>
                                    </div>
                                    <select 
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[10px] font-bold"
                                        value={settings.todoReminderFrequency}
                                        onChange={e => setSettings({...settings, todoReminderFrequency: e.target.value as AnnouncementFrequency})}
                                    >
                                        <FrequencyOptions />
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Stock Level Reminder */}
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/50 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2 mb-4">
                                    <PackageSearch size={18} /> Stoklar
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="showStock"
                                            className="w-5 h-5 text-orange-600 rounded-lg"
                                            checked={settings.showStockReminder}
                                            onChange={e => setSettings({...settings, showStockReminder: e.target.checked})}
                                        />
                                        <label htmlFor="showStock" className="text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer">Kritik stok uyarısı</label>
                                    </div>
                                    <select 
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[10px] font-bold"
                                        value={settings.stockReminderFrequency}
                                        onChange={e => setSettings({...settings, stockReminderFrequency: e.target.value as AnnouncementFrequency})}
                                    >
                                        <FrequencyOptions />
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Tax Payment Reminder */}
                        <div className="bg-cyan-50 dark:bg-cyan-900/10 p-5 rounded-2xl border border-cyan-100 dark:border-cyan-900/50 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-2 mb-4">
                                    <Scale size={18} /> Vergiler
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="showTax"
                                            className="w-5 h-5 text-cyan-600 rounded-lg"
                                            checked={settings.showTaxReminder}
                                            onChange={e => setSettings({...settings, showTaxReminder: e.target.checked})}
                                        />
                                        <label htmlFor="showTax" className="text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer">Vadesi gelen vergiler</label>
                                    </div>
                                    <select 
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[10px] font-bold"
                                        value={settings.taxReminderFrequency}
                                        onChange={e => setSettings({...settings, taxReminderFrequency: e.target.value as AnnouncementFrequency})}
                                    >
                                        <FrequencyOptions />
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Debt & Credit Reminder - YENİ */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2 mb-4">
                                    <Landmark size={18} /> Borç & Alacak
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            id="showDebt"
                                            className="w-5 h-5 text-indigo-600 rounded-lg"
                                            checked={settings.showDebtReminder}
                                            onChange={e => setSettings({...settings, showDebtReminder: e.target.checked})}
                                        />
                                        <label htmlFor="showDebt" className="text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer">Vadesi gelen ödemeler</label>
                                    </div>
                                    <select 
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[10px] font-bold"
                                        value={settings.debtReminderFrequency}
                                        onChange={e => setSettings({...settings, debtReminderFrequency: e.target.value as AnnouncementFrequency})}
                                    >
                                        <FrequencyOptions />
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Custom Announcements */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 px-1">
                            <ListPlus size={18} className="text-purple-600" /> Manuel Duyurular
                        </h3>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="Örn: Hafta sonu kampanya hazırlığını unutma!"
                                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 text-sm"
                                value={newAnnouncementText}
                                onChange={e => setNewAnnouncementText(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleAddCustom()}
                            />
                            <button 
                                onClick={handleAddCustom}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 rounded-xl font-bold transition shadow-lg shadow-purple-200 dark:shadow-none flex items-center gap-2"
                            >
                                <Plus size={20} /> Ekle
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 mt-4">
                            {settings.customAnnouncements.length > 0 ? settings.customAnnouncements.map(ann => (
                                <div key={ann.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${ann.isActive ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm' : 'bg-gray-50 dark:bg-gray-900/50 border-transparent opacity-60'}`}>
                                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
                                        <button onClick={() => handleUpdateCustom(ann.id, { isActive: !ann.isActive })} className={`${ann.isActive ? 'text-green-500' : 'text-gray-400'}`}>
                                            {ann.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                        </button>
                                        <input 
                                            type="text"
                                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-800 dark:text-white"
                                            value={ann.text}
                                            onChange={e => handleUpdateCustom(ann.id, { text: e.target.value })}
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Sıklık:</span>
                                            <select 
                                                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-[10px] font-bold"
                                                value={ann.frequency}
                                                onChange={e => handleUpdateCustom(ann.id, { frequency: e.target.value as AnnouncementFrequency })}
                                            >
                                                <FrequencyOptions />
                                            </select>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteCustom(ann.id)} className="ml-4 text-gray-300 hover:text-red-500 p-1.5 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
                                    Henüz manuel bir duyuru eklemediniz.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-4">
                    {saved && (
                        <span className="text-green-600 text-sm font-bold flex items-center gap-1 animate-fade-in">
                            <CheckCircle size={16} /> Kaydedildi
                        </span>
                    )}
                    <button 
                        onClick={handleSaveGeneral}
                        className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center gap-2"
                    >
                        <Save size={18} /> Ayarları Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
};

const ShippingSettingsTab: React.FC = () => {
    const [settings, setSettings] = useState<ShippingSettings>(getShippingSettings());
    const [saved, setSaved] = useState(false);
    const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);

    const handleUpdatePrice = (desi: number, price: number) => {
        setSettings(prev => ({
            ...prev,
            prices: { ...prev.prices, [desi]: price }
        }));
    };

    const handleSave = () => {
        saveShippingSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleAddCompany = () => {
        const newCompany: ShippingCompany = {
            id: generateId(),
            name: '',
            prices: {}
        };
        setEditingCompany(newCompany);
    };

    const handleSaveCompany = () => {
        if (!editingCompany || !editingCompany.name) return;
        const updatedCompanies = [...(settings.companies || [])];
        const index = updatedCompanies.findIndex(c => c.id === editingCompany.id);
        if (index >= 0) updatedCompanies[index] = editingCompany;
        else updatedCompanies.push(editingCompany);
        
        const next = { ...settings, companies: updatedCompanies };
        setSettings(next);
        saveShippingSettings(next);
        setEditingCompany(null);
    };

    const handleDeleteCompany = (id: string) => {
        if (!window.confirm('Bu kargo firmasını silmek istediğinize emin misiniz?')) return;
        const next = { ...settings, companies: (settings.companies || []).filter(c => c.id !== id) };
        setSettings(next);
        saveShippingSettings(next);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <Truck size={24} className="text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Genel Kargo Ücret Tanımları</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 10, 20, 30].map(desi => (
                        <div key={desi} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{desi} Desi Fiyatı</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400 text-sm">₺</span>
                                <input 
                                    type="number" 
                                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                                    value={settings.prices[desi] || ''}
                                    onChange={(e) => handleUpdatePrice(desi, parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                    {saved && <span className="text-green-600 text-sm font-bold flex items-center gap-1"><CheckCircle size={16}/> Kaydedildi</span>}
                    <button 
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                    >
                        Fiyatları Kaydet
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                        <Truck size={24} className="text-purple-600" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Kargo Firmaları</h2>
                    </div>
                    <button onClick={handleAddCompany} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all">
                        <Plus size={18} /> Firma Ekle
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(settings.companies || []).map(company => (
                        <div key={company.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white">{company.name}</h3>
                                <p className="text-xs text-gray-500">{Object.keys(company.prices).length} desi tanımlı</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingCompany(company)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18}/></button>
                                <button onClick={() => handleDeleteCompany(company.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {editingCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white">Kargo Firması Düzenle</h3>
                            <button onClick={() => setEditingCompany(null)}><X size={24} className="text-gray-400"/></button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Firma Adı</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                    value={editingCompany.name}
                                    onChange={e => setEditingCompany({...editingCompany, name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[1, 2, 3, 4, 5, 10, 20, 30].map(desi => (
                                    <div key={desi}>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{desi} Desi</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1.5 text-gray-400 text-xs">₺</span>
                                            <input 
                                                type="number" 
                                                className="w-full pl-5 pr-2 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                                                value={editingCompany.prices[desi] || ''}
                                                onChange={e => setEditingCompany({
                                                    ...editingCompany,
                                                    prices: { ...editingCompany.prices, [desi]: parseFloat(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button onClick={() => setEditingCompany(null)} className="px-5 py-2 text-gray-500 font-medium">İptal</button>
                                <button onClick={handleSaveCompany} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-xl font-bold shadow-lg shadow-purple-200 dark:shadow-none transition-all">Kaydet</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PlatformsSettingsTab: React.FC = () => {
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);

    useEffect(() => {
        setPlatforms(getPlatforms());
    }, []);

    const handleAdd = () => {
        const newPlatform: Platform = {
            id: generateId(),
            name: '',
            defaultCommissionRate: 19,
            defaultServiceFee: 13.90
        };
        setEditingPlatform(newPlatform);
    };

    const handleSave = () => {
        if (!editingPlatform || !editingPlatform.name) return;
        savePlatform(editingPlatform);
        setPlatforms(getPlatforms());
        setEditingPlatform(null);
    };

    const handleDelete = (id: string) => {
        if (!window.confirm('Bu platformu silmek istediğinize emin misiniz?')) return;
        deletePlatform(id);
        setPlatforms(getPlatforms());
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Satış Platformları</h2>
                <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all">
                    <Plus size={18} /> Platform Ekle
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platforms.map(platform => (
                    <div key={platform.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{platform.name}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingPlatform(platform)} className="text-blue-500 hover:bg-blue-50 p-1 rounded transition-colors"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDelete(platform.id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Komisyon:</span>
                                    <span className="font-bold text-gray-800 dark:text-white">%{platform.defaultCommissionRate}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Hizmet Bedeli:</span>
                                    <span className="font-bold text-gray-800 dark:text-white">₺{platform.defaultServiceFee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editingPlatform && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white">Platform Düzenle</h3>
                            <button onClick={() => setEditingPlatform(null)}><X size={24} className="text-gray-400"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Platform Adı</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editingPlatform.name}
                                    onChange={e => setEditingPlatform({...editingPlatform, name: e.target.value})}
                                    placeholder="Örn: Trendyol, Hepsiburada"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Komisyon (%)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingPlatform.defaultCommissionRate}
                                        onChange={e => setEditingPlatform({...editingPlatform, defaultCommissionRate: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hizmet Bedeli (₺)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingPlatform.defaultServiceFee}
                                        onChange={e => setEditingPlatform({...editingPlatform, defaultServiceFee: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setEditingPlatform(null)} className="px-5 py-2 text-gray-500 font-medium">İptal</button>
                                <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all">Kaydet</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MessageSettings: React.FC = () => {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: '', content: '' });

    useEffect(() => { setTemplates(getTemplates()); }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveTemplate({ id: editingId || generateId(), ...formData });
        setTemplates(getTemplates());
        handleCloseModal();
    };

    const handleEdit = (tmpl: MessageTemplate) => {
        setEditingId(tmpl.id);
        setFormData({ title: tmpl.title, content: tmpl.content });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
            deleteTemplate(id);
            setTemplates(getTemplates());
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ title: '', content: '' });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Hazır Mesaj Şablonları</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all">
                    <Plus size={18} /> Yeni Şablon
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(tmpl => (
                    <div key={tmpl.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm group">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-800 dark:text-white">{tmpl.title}</h3>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(tmpl)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 size={16}/></button>
                                <button onClick={() => handleDelete(tmpl.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">{tmpl.content}</p>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white">{editingId ? 'Şablonu Düzenle' : 'Yeni Şablon Ekle'}</h3>
                            <button onClick={handleCloseModal}><X size={24} className="text-gray-400"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Şablon Başlığı</label>
                                <input type="text" required className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Örn: Sipariş Onayı" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mesaj İçeriği</label>
                                <textarea required className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white h-48 outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Mesajınızı buraya yazın..." />
                                <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                    <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-2">Kullanılabilir Değişkenler:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['{isim}', '{soyisim}', '{ad_soyad}', '{indirim_kodu}', '{siparis_no}', '{cinsiyet}', '{hitap}'].map(v => (
                                            <code key={v} className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-700 text-blue-600 font-mono">{v}</code>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={handleCloseModal} className="px-5 py-2 text-gray-500 font-medium">İptal</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const IntegrationSettings: React.FC = () => {
    const [config, setConfig] = useState<TrendyolConfig>({
        isActive: false, supplierId: '', apiKey: '', apiSecret: '', isTestMode: false, useProxy: true
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

    useEffect(() => {
        const saved = getTrendyolConfig();
        if (saved) setConfig(saved);
    }, []);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        saveTrendyolConfig(config);
        setStatus({ type: 'success', message: 'Yapılandırma başarıyla kaydedildi.' });
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    };

    const handleSync = async () => {
        setLoading(true);
        setStatus({ type: 'idle', message: '' });
        
        try {
            const result = await fetchTrendyolProducts();
            if (result.success && result.data?.content) {
                const products = getProducts();
                let updateCount = 0;
                let newCount = 0;

                result.data.content.forEach((tp: any) => {
                    const existing = products.find(p => p.barcode === tp.barcode);
                    if (existing) {
                        existing.marketPrice = tp.listPrice;
                        existing.price = tp.salePrice;
                        existing.stock = tp.stock;
                        saveProduct(existing);
                        updateCount++;
                    } else {
                        const newProd: Product = {
                            id: generateId(), barcode: tp.barcode, code: tp.productCode, name: tp.title, category: tp.categoryName || 'Genel', brand: tp.brand?.name || 'Aristokrates', stock: tp.stock, price: tp.salePrice, marketPrice: tp.listPrice, cost: 0, desi: 1, images: tp.images?.map((img:any) => ({ id: generateId(), data: img.url, fileName: 'trendyol-image', type: 'image/url' }))
                        };
                        saveProduct(newProd);
                        newCount++;
                    }
                });

                setStatus({ type: 'success', message: `${updateCount} ürün güncellendi, ${newCount} yeni ürün eklendi.` });
            } else {
                setStatus({ type: 'error', message: result.message || 'Ürünler çekilemedi.' });
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: 'Hata: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-orange-50/30 dark:bg-orange-900/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500 text-white rounded-lg"><LinkIcon size={24}/></div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Trendyol Satıcı Entegrasyonu</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${config.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                        <span className="text-xs font-bold text-gray-500 uppercase">{config.isActive ? 'AKTİF' : 'PASİF'}</span>
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <input type="checkbox" id="isActive" className="w-5 h-5 text-orange-500 rounded border-gray-300" checked={config.isActive} onChange={e => setConfig({...config, isActive: e.target.checked})} />
                            <label htmlFor="isActive" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">Entegrasyonu Aktifleştir</label>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1"><Server size={12}/> Satıcı ID (Supplier ID)</label>
                            <input type="text" required className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-gray-900" value={config.supplierId} onChange={e => setConfig({...config, supplierId: e.target.value})} placeholder="Örn: 123456" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1"><Key size={12}/> API Key</label>
                            <input type="text" required className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-gray-900 font-mono" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1"><ShieldCheck size={12}/> API Secret</label>
                            <input type="password" required className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-gray-900 font-mono" value={config.apiSecret} onChange={e => setConfig({...config, apiSecret: e.target.value})} />
                        </div>
                    </div>
                    
                    <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                             <button type="submit" className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all">
                                <Save size={18} /> Ayarları Kaydet
                            </button>
                            <button type="button" onClick={handleSync} disabled={loading || !config.isActive} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-orange-200 dark:shadow-none">
                                {loading ? <RefreshCw size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                                Ürünleri Şimdi Senkronize Et
                            </button>
                        </div>
                        {status.message && (
                            <div className={`text-sm font-bold flex items-center gap-2 ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {status.type === 'success' ? <CheckCircle size={18}/> : <AlertIcon size={18}/>}
                                {status.message}
                            </div>
                        )}
                    </div>
                </form>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
                <Info size={24} className="text-blue-500 shrink-0 mt-1" />
                <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    <p className="font-bold mb-2">Trendyol Senkronizasyonu Hakkında</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Senkronizasyon işlemi Trendyol'daki <b>Fiyat, Stok ve Piyasa Fiyatı</b> bilgilerini ürün listenizle eşleştirir.</li>
                        <li>Ürün eşleştirmesi <b>Barkod</b> üzerinden yapılır. Eğer barkod sistemde yoksa yeni ürün kartı oluşturulur.</li>
                        <li>Ürün resimleri Trendyol'dan URL olarak çekilir, veritabanınızı şişirmez.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

const LogsSettings: React.FC = () => {
    const [logs, setLogs] = useState<SystemLog[]>([]);

    useEffect(() => { setLogs(getSystemLogs()); }, []);

    const handleClear = () => {
        if (window.confirm('Tüm hata kayıtlarını silmek istediğinize emin misiniz?')) {
            clearSystemLogs();
            setLogs([]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><ShieldAlert size={20} className="text-red-500"/> Sistem ve Hata Kayıtları</h2>
                <button onClick={handleClear} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                    <Trash2 size={18} /> Kayıtları Temizle
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {logs.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {logs.map(log => (
                            <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        {log.type === 'error' ? <XCircle size={18} className="text-red-500"/> : log.type === 'warning' ? <AlertTriangle size={18} className="text-orange-500"/> : <CheckCircle size={18} className="text-green-500"/>}
                                        <span className="font-bold text-gray-800 dark:text-white text-sm">{log.title}</span>
                                        <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full uppercase text-gray-500">{log.source}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400">{new Date(log.date).toLocaleString('tr-TR')}</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 ml-7 leading-relaxed">{log.message}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400">
                        <ShieldCheck size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Henüz kayıtlı bir sistem olayı bulunmuyor.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
