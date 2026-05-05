import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, User, Clock, Trash2, CheckCircle2, Users, ListFilter, CheckSquare, Square, ExternalLink, ArrowRight, Award, MessageCircle, ArrowUpDown, Calendar, AlertTriangle, Timer, Info } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { Customer, MessageLog, MessageTemplate, Sale } from '../types';
import { deleteMessageLog, generateId, getCustomers, getMessageLogs, getSales, getTemplates, saveMessageLog } from '../services/db';

interface QueueItem {
    id: string; // Unique ID for the queue item
    customerId: string;
    customerName: string;
    phone: string;
    messageContent: string;
    status: 'pending' | 'sent';
    isDuplicate?: boolean; // Warning flag
    lastSentDate?: string;
    orderNumber?: string;
}

const Messages: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'bulk' | 'history'>('send');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);

  // Single Send State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messageContent, setMessageContent] = useState('');

  // Bulk Send State
  const [bulkTemplateId, setBulkTemplateId] = useState('');
  const [selectedBulkSaleIds, setSelectedBulkSaleIds] = useState<Set<string>>(new Set());
  const [bulkQueue, setBulkQueue] = useState<QueueItem[]>([]);
  const [isQueueReady, setIsQueueReady] = useState(false);
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  
  // Bulk Filters & Sorting
  const [bulkFilterType, setBulkFilterType] = useState<'all' | 'loyal' | 'reviewer'>('all');
  const [bulkSortOrder, setBulkSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Delay & Cooldown State
  const [delaySeconds, setDelaySeconds] = useState(30);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  // Cooldown Timer Effect
  useEffect(() => {
      let interval: any;
      if (cooldown > 0) {
          interval = setInterval(() => {
              setCooldown((prev) => prev - 1);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [cooldown]);

  const loadData = () => {
    setCustomers(getCustomers());
    setTemplates(getTemplates());
    setSales(getSales());
    setMessageLogs(getMessageLogs());
  };

  // --- HELPERS ---
  const getCustomerSaleCount = (customerId: string) => {
    return sales.filter(s => s.customerId === customerId && s.status !== 'cancelled').length;
  };

  const isLoyal = (customerId: string) => {
    return getCustomerSaleCount(customerId) >= 3;
  };

  const getLastSale = (customerId: string) => {
      const customerSales = sales.filter(s => s.customerId === customerId && s.status !== 'cancelled');
      if (customerSales.length === 0) return null;
      // Sort by date descending, then by order number descending
      return customerSales.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateB - dateA;
          
          const orderA = a.orderNumber || '';
          const orderB = b.orderNumber || '';
          return orderB.localeCompare(orderA);
      })[0];
  };

  const processTemplate = (templateContent: string, customer: Customer, specificSale?: Sale | null) => {
        let processedContent = templateContent;
        
        // Name Parsing
        const nameParts = customer.name.trim().split(' ');
        let firstName = customer.name;
        let lastName = '';

        if (nameParts.length > 1) {
            lastName = nameParts.pop() || '';
            firstName = nameParts.join(' ');
        }

        // Replace variables
        processedContent = processedContent.replace(/{isim}/g, firstName);
        processedContent = processedContent.replace(/{soyisim}/g, lastName);
        processedContent = processedContent.replace(/{ad_soyad}/g, customer.name);
        processedContent = processedContent.replace(/{indirim_kodu}/g, customer.discountCode || '---');
        
        // Gender Salutation
        const salutation = customer.gender === 'male' ? 'Bey' : customer.gender === 'female' ? 'Hanım' : '';
        processedContent = processedContent.replace(/{cinsiyet}/g, salutation);
        processedContent = processedContent.replace(/{hitap}/g, salutation);
        
        // Replace Order Number
        const saleToUse = specificSale || getLastSale(customer.id);
        const orderNo = saleToUse ? (saleToUse.orderNumber || '---') : '---';
        
        processedContent = processedContent.replace(/{siparis_no}/g, orderNo);

        return processedContent;
  };

  // --- SINGLE SEND EFFECT ---
  useEffect(() => {
    if (selectedTemplateId && selectedCustomerId) {
        const template = templates.find(t => t.id === selectedTemplateId);
        const customer = customers.find(c => c.id === selectedCustomerId);
        
        if (template && customer) {
            setMessageContent(processTemplate(template.content, customer));
        }
    } else if (selectedTemplateId) {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (template) setMessageContent(template.content);
    }
  }, [selectedTemplateId, selectedCustomerId, templates, customers, sales]);

  // --- ACTION: Send Message (Shared Logic) ---
  const executeSendMessage = (phone: string, content: string, customerId: string, customerName: string, templateTitle: string, orderNumber?: string) => {
      let cleanPhone = phone.replace(/\D/g, ''); 
      if (phone.startsWith('0') && cleanPhone.length === 11) {
          cleanPhone = '90' + cleanPhone.substring(1);
      }
      else if (cleanPhone.length === 10) {
          cleanPhone = '90' + cleanPhone;
      }

      // 1. Save Log
      const newLog: MessageLog = {
          id: generateId(),
          customerId: customerId,
          customerName: customerName,
          phone: phone,
          templateTitle: templateTitle,
          content: content,
          sentAt: new Date().toISOString(),
          orderNumber: orderNumber
      };
      saveMessageLog(newLog);
      setMessageLogs(prev => [newLog, ...prev]);

      // 2. Open WhatsApp
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(content)}`;
      window.open(url, '_blank');
  };

  const handleSingleSend = () => {
      const customer = customers.find(c => c.id === selectedCustomerId);
      const template = templates.find(t => t.id === selectedTemplateId);
      if (!customer || !messageContent) return;
      
      const latestSale = getLastSale(customer.id);
      const orderNo = latestSale?.orderNumber;
      
      executeSendMessage(customer.phone, messageContent, customer.id, customer.name, template ? template.title : 'Özel Mesaj', orderNo);
  };

  // --- BULK SEND LOGIC ---
  const toggleBulkSale = (id: string) => {
      const newSet = new Set(selectedBulkSaleIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedBulkSaleIds(newSet);
  };

  const selectAllBulk = () => {
      if (selectedBulkSaleIds.size === filteredAndSortedItems.length) {
          setSelectedBulkSaleIds(new Set());
      } else {
          const newSet = new Set<string>();
          filteredAndSortedItems.forEach(item => newSet.add(item.sale.id));
          setSelectedBulkSaleIds(newSet);
      }
  };

  const prepareBulkQueue = () => {
      if (!bulkTemplateId || selectedBulkSaleIds.size === 0) return;
      const template = templates.find(t => t.id === bulkTemplateId);
      if (!template) return;

      let duplicateCount = 0;
      const queue: QueueItem[] = [];
      
      selectedBulkSaleIds.forEach(saleId => {
          const sale = sales.find(s => s.id === saleId);
          if (sale) {
              const customer = customers.find(c => c.id === sale.customerId);
              if (customer) {
                  // Check duplicate
                  const previousLog = messageLogs.find(log => 
                      log.customerId === customer.id && 
                      log.templateTitle === template.title &&
                      log.orderNumber === sale.orderNumber
                  );

                  if (previousLog) duplicateCount++;

                  queue.push({
                      id: generateId(),
                      customerId: customer.id,
                      customerName: customer.name,
                      phone: customer.phone,
                      messageContent: processTemplate(template.content, customer, sale),
                      status: 'pending',
                      isDuplicate: !!previousLog,
                      lastSentDate: previousLog ? previousLog.sentAt : undefined,
                      orderNumber: sale.orderNumber
                  });
              }
          }
      });

      if (duplicateCount > 0) {
          alert(`Uyarı: Seçtiğiniz siparişlerden ${duplicateCount} tanesine bu şablon daha önce gönderilmiş. Listede sarı renk ile işaretlendi.`);
      }

      setBulkQueue(queue);
      setIsQueueReady(true);
  };

  const handleBulkItemSend = (item: QueueItem) => {
      if (cooldown > 0) return; // Prevent sending if cooldown is active

      const template = templates.find(t => t.id === bulkTemplateId);
      
      // Removed window.confirm because checking duplications via a popup can be blocked by browsers
      // and the UI already provides visual warning (yellow row & "Send Anyway" text).

      executeSendMessage(item.phone, item.messageContent, item.customerId, item.customerName, template ? template.title : 'Toplu Gönderim', item.orderNumber);
      
      // Update queue status
      setBulkQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'sent' } : q));

      // START COOLDOWN
      setCooldown(delaySeconds);
  };

  const resetBulk = () => {
      setIsQueueReady(false);
      setBulkQueue([]);
      setCooldown(0);
  };

  const handleDeleteLog = (id: string) => {
      if(window.confirm('Bu mesaj kaydını silmek istediğinize emin misiniz?')) {
          deleteMessageLog(id);
          setMessageLogs(prev => prev.filter(l => l.id !== id));
      }
  };

  const customerOptions = customers.map(c => ({
      value: c.id,
      label: c.name,
      subLabel: c.phone
  }));

  // Logic for filtering and sorting
  const filteredAndSortedItems = React.useMemo(() => {
    // 1. Get all valid sales (not cancelled)
    const validSales = sales.filter(s => s.status !== 'cancelled');
    
    // 2. Map sales to items (customer + sale)
    const items = validSales.map(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        return { customer, sale };
    }).filter(item => item.customer !== undefined) as { customer: Customer, sale: Sale }[];

    // 3. Apply Filters
    const filtered = items.filter(item => {
        const { customer, sale } = item;
        
        // Search
        const matchesSearch = customer.name.toLowerCase().includes(bulkSearchTerm.toLowerCase()) || 
                              customer.phone.includes(bulkSearchTerm);
        if (!matchesSearch) return false;

        // Type Filter
        if (bulkFilterType === 'loyal' && !isLoyal(customer.id)) return false;
        if (bulkFilterType === 'reviewer' && !customer.hasReview) return false;

        // Already Sent Filter (Selected Template + Order Number)
        if (bulkTemplateId) {
            const template = templates.find(t => t.id === bulkTemplateId);
            if (template) {
                const hasSent = messageLogs.some(log => 
                    log.customerId === customer.id && 
                    log.templateTitle === template.title && 
                    log.orderNumber === sale.orderNumber
                );
                if (hasSent) return false;
            }
        }

        return true;
    });

    // 4. Sort
    return filtered.sort((a, b) => {
        const dateA = new Date(a.sale.date).getTime();
        const dateB = new Date(b.sale.date).getTime();

        if (dateA !== dateB) {
            return bulkSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        }

        const orderA = a.sale.orderNumber || '';
        const orderB = b.sale.orderNumber || '';
        return bulkSortOrder === 'newest' ? orderB.localeCompare(orderA) : orderA.localeCompare(orderB);
    });
  }, [customers, sales, bulkSearchTerm, bulkFilterType, bulkTemplateId, bulkSortOrder, messageLogs, templates]);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <MessageSquare className="text-purple-600" />
                Mesaj Merkezi
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Müşterilerinize tekil veya toplu mesajlar gönderin.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('send')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'send' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Send size={18} />
                Tekil Gönder
            </button>
            <button 
                onClick={() => setActiveTab('bulk')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'bulk' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Users size={18} />
                Toplu Gönder
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Clock size={18} />
                Mesaj Geçmişi
            </button>
        </div>

        {/* Content */}
        <div className="mt-6">
            {/* --- TAB: SINGLE SEND --- */}
            {activeTab === 'send' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">1. Alıcı Seçimi</h3>
                            <SearchableSelect
                                label="Müşteri"
                                placeholder="Müşteri ara..."
                                options={customerOptions}
                                value={selectedCustomerId}
                                onChange={setSelectedCustomerId}
                                required
                            />
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">2. Şablon Seçimi</h3>
                            {templates.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {templates.map(tmpl => (
                                        <button
                                            key={tmpl.id}
                                            onClick={() => setSelectedTemplateId(tmpl.id)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                                                selectedTemplateId === tmpl.id 
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 shadow-sm' 
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            <div className="font-medium text-sm">{tmpl.title}</div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">Kayıtlı şablon bulunamadı. Ayarlar kısmından şablon ekleyebilirsiniz.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col h-full">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 flex flex-col">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">3. Önizleme ve Gönder</h3>
                            
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Mesaj İçeriği (Düzenlenebilir)</label>
                                <textarea
                                    className="w-full h-64 p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none font-sans leading-relaxed"
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    placeholder="Şablon seçiniz..."
                                ></textarea>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                {selectedCustomerId ? (
                                    <button
                                        onClick={handleSingleSend}
                                        disabled={!messageContent}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={20} />
                                        WhatsApp ile Gönder
                                    </button>
                                ) : (
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 text-gray-400 py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                                        <User size={20} />
                                        Lütfen önce müşteri seçiniz
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: BULK SEND --- */}
            {activeTab === 'bulk' && (
                <div className="animate-fade-in space-y-6">
                    {!isQueueReady ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Step 1: Template */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
                                <h3 className="font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">1. Şablon Seçimi</h3>
                                {templates.length > 0 ? (
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                        {templates.map(tmpl => (
                                            <button
                                                key={tmpl.id}
                                                onClick={() => setBulkTemplateId(tmpl.id)}
                                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                                    bulkTemplateId === tmpl.id 
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 shadow-sm' 
                                                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <div className="font-medium text-sm">{tmpl.title}</div>
                                                <div className="text-xs text-gray-400 line-clamp-1 mt-1">{tmpl.content}</div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Kayıtlı şablon bulunamadı.</p>
                                )}
                            </div>

                            {/* Step 2: Customers */}
                            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[650px]">
                                <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-2 space-y-3">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <h3 className="font-bold text-gray-800 dark:text-white">2. Müşteri Listesi</h3>
                                        <input 
                                            type="text" 
                                            placeholder="Müşteri ara..." 
                                            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm w-full sm:w-64 outline-none"
                                            value={bulkSearchTerm}
                                            onChange={(e) => setBulkSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    
                                    {/* Filter Buttons */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <div className="flex gap-2">
                                            <button onClick={() => setBulkFilterType('all')} className={`px-2.5 py-1 text-xs rounded-md border ${bulkFilterType === 'all' ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-black' : 'border-gray-200 dark:border-gray-600'}`}>Tümü</button>
                                            <button onClick={() => setBulkFilterType('loyal')} className={`px-2.5 py-1 text-xs rounded-md border flex items-center gap-1 ${bulkFilterType === 'loyal' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'border-gray-200 dark:border-gray-600'}`}><Award size={12} /> Daimi</button>
                                            <button onClick={() => setBulkFilterType('reviewer')} className={`px-2.5 py-1 text-xs rounded-md border flex items-center gap-1 ${bulkFilterType === 'reviewer' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'border-gray-200 dark:border-gray-600'}`}><MessageCircle size={12} /> Yorumcu</button>
                                        </div>
                                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>
                                        <button 
                                            onClick={() => setBulkSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                                            className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-600 flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            <ArrowUpDown size={12} />
                                            {bulkSortOrder === 'newest' ? 'Sipariş: Yeniden Eskiye' : 'Sipariş: Eskiden Yeniye'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-2 text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">{filteredAndSortedItems.length} sipariş listelendi</span>
                                    <button 
                                        onClick={selectAllBulk}
                                        className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                    >
                                        {selectedBulkSaleIds.size === filteredAndSortedItems.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                    {filteredAndSortedItems.map(item => {
                                        const { customer, sale } = item;
                                        const isSelected = selectedBulkSaleIds.has(sale.id);
                                        
                                        return (
                                            <div 
                                                key={sale.id} 
                                                onClick={() => toggleBulkSale(sale.id)}
                                                className={`flex items-start p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                            >
                                                <div className={`mr-3 mt-1 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-300 dark:text-gray-600'}`}>
                                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-medium text-gray-800 dark:text-white flex items-center gap-1">
                                                                {customer.name}
                                                                {isLoyal(customer.id) && <Award size={14} className="text-yellow-500 fill-yellow-500" />}
                                                                {customer.hasReview && <MessageCircle size={14} className="text-purple-500 fill-purple-500" />}
                                                            </div>
                                                            <div className="text-xs text-gray-500 font-mono">{customer.phone}</div>
                                                        </div>
                                                        {customer.discountCode && (
                                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200 font-mono">
                                                                {customer.discountCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Order Info */}
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded">
                                                        <Calendar size={12} />
                                                        <span>
                                                            Sipariş Tarihi: <strong>{new Date(sale.date).toLocaleDateString('tr-TR')}</strong>
                                                            {sale.orderNumber && <span className="ml-1 text-gray-400">#{sale.orderNumber}</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredAndSortedItems.length === 0 && (
                                        <div className="p-8 text-center text-gray-500">Gönderilecek sipariş bulunamadı.</div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <div className="text-sm font-medium">
                                        Seçili: <span className="text-purple-600">{selectedBulkSaleIds.size} Sipariş</span>
                                    </div>
                                    <button 
                                        onClick={prepareBulkQueue}
                                        disabled={!bulkTemplateId || selectedBulkSaleIds.size === 0}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-purple-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                    >
                                        Listeyi Hazırla <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // QUEUE VIEW
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <ListFilter className="text-purple-600" />
                                        Gönderim Kuyruğu
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Toplam {bulkQueue.length} mesaj hazırlandı. Lütfen sırayla gönderim yapınız.
                                    </p>
                                </div>
                                <button 
                                    onClick={resetBulk}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-sm font-medium px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                                >
                                    Listeyi İptal Et
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3">Durum</th>
                                            <th className="px-6 py-3">Müşteri</th>
                                            <th className="px-6 py-3">Mesaj Önizleme (Kişiselleştirilmiş)</th>
                                            <th className="px-6 py-3 text-right">Aksiyon</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {bulkQueue.map((item, index) => (
                                            <tr key={item.id} className={`transition-colors ${item.status === 'sent' ? 'bg-green-50/50 dark:bg-green-900/10' : (item.isDuplicate ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50')}`}>
                                                <td className="px-6 py-4">
                                                    {item.status === 'sent' ? (
                                                        <span className="flex items-center gap-1 text-green-600 font-bold text-sm">
                                                            <CheckCircle2 size={16} /> Gönderildi
                                                        </span>
                                                    ) : (
                                                        item.isDuplicate ? (
                                                            <div className="flex flex-col">
                                                                <span className="flex items-center gap-1 text-yellow-600 font-bold text-sm">
                                                                    <AlertTriangle size={16} /> Uyarı
                                                                </span>
                                                                <span className="text-[10px] text-yellow-700 dark:text-yellow-500">Daha önce gönderildi</span>
                                                                {item.lastSentDate && <span className="text-[10px] text-gray-400">{new Date(item.lastSentDate).toLocaleDateString('tr-TR')}</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-gray-400 text-sm">
                                                                <Clock size={16} /> Bekliyor
                                                            </span>
                                                        )
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-800 dark:text-white">{item.customerName}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{item.phone}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-600 dark:text-gray-300 max-w-md truncate" title={item.messageContent}>
                                                        {item.messageContent}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {item.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleBulkItemSend(item)}
                                                            disabled={cooldown > 0}
                                                            className={`text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ml-auto shadow-sm transition-colors ${
                                                                cooldown > 0 
                                                                    ? 'bg-gray-400 cursor-wait' 
                                                                    : (item.isDuplicate ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700')
                                                            }`}
                                                        >
                                                            {cooldown > 0 
                                                                ? `Bekleyiniz (${cooldown})` 
                                                                : (item.isDuplicate ? 'Yine de Gönder' : "WhatsApp'ı Aç")
                                                            } 
                                                            {cooldown === 0 && <ExternalLink size={14} />}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Delay & Settings Footer */}
                            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">
                                            <Timer size={18} className="text-blue-500" />
                                            <span>Gecikme Süresi (Saniye):</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            min="5" 
                                            max="300"
                                            value={delaySeconds}
                                            onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 30)}
                                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-500 rounded text-center font-bold text-gray-800 dark:text-white bg-white dark:bg-gray-600 outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    
                                    <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 max-w-lg bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                                        <Info size={16} className="shrink-0 mt-0.5" />
                                        <p>
                                            <strong>Önemli:</strong> WhatsApp'ın spam politikalarından dolayı tekrarlı mesaj gönderimlerinde hesabınızın kısıtlanmaması için <strong>en az 30 saniye</strong> gecikme süresi kullanılması önerilmektedir. Sistem bu süre dolmadan bir sonraki mesajı göndermenize izin vermeyecektir.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB: HISTORY --- */}
            {activeTab === 'history' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
                    {messageLogs.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-sm">
                                    <tr>
                                        <th className="px-6 py-3">Tarih</th>
                                        <th className="px-6 py-3">Müşteri</th>
                                        <th className="px-6 py-3">Şablon / Başlık</th>
                                        <th className="px-6 py-3">İçerik Özeti</th>
                                        <th className="px-6 py-3 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {messageLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {new Date(log.sentAt).toLocaleDateString('tr-TR')} <span className="text-xs text-gray-400">{new Date(log.sentAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-800 dark:text-gray-200">{log.customerName}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{log.phone}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs">
                                                    {log.templateTitle}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={log.content}>
                                                {log.content}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                                    title="Kaydı Sil"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-10 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                            <Clock size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
                            <p>Henüz gönderilmiş mesaj kaydı bulunmuyor.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default Messages;