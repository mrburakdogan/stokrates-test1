import { getTrendyolConfig, saveTrendyolSyncState, getTrendyolSyncState, saveSystemLog, generateId } from './db';

const TRENDYOL_API_BASE = 'https://api.trendyol.com/sapigw';

// ============================================================
// YETKILENDIRME
// ============================================================
const getHeaders = (apiKey: string, apiSecret: string, supplierId: string) => {
    const authString = btoa(`${apiKey}:${apiSecret}`);
    return {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'User-Agent': `${supplierId} - STOKratesApp`
    };
};

// ============================================================
// PROXY YARDIMCISI — CORS için Express proxy üzerinden iletir
// ============================================================
const fetchViaProxy = async (targetUrl: string, options: RequestInit = {}) => {
    const response = await fetch('/.netlify/functions/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, options })
    });

    if (response.status === 404) throw new Error('PROXY_NOT_FOUND');
    if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`Proxy Error ${response.status}: ${txt.substring(0, 200)}`);
    }
    return response;
};

// ============================================================
// TÜRKİYE SAATİ — UTC+3 olarak şimdiki zaman (ms)
// Trendyol API'si UTC ms kullanır, biz de aynı şekilde kullanırız.
// Türkiye saati = UTC + 3 saat; ancak timestamp her zaman UTC ms'dir.
// Bu fonksiyon sadece "Türkiye'de gün sonu" gibi hesaplar için kullanılır.
// ============================================================
const nowTR = (): number => {
    // JavaScript'in Date.now() zaten UTC ms döndürür; Trendyol de UTC ms bekler.
    // Türkiye'de gece yarısı = UTC 21:00 — biz her zaman Date.now() kullanabiliriz.
    return Date.now();
};

// ============================================================
// SİPARİŞ ÇEKME — Belirli bir zaman aralığını sayfalı şekilde çek
// ============================================================
const fetchOrdersInWindow = async (
    supplierId: string,
    headers: Record<string, string>,
    startMs: number,
    endMs: number
): Promise<any[]> => {
    const orders: any[] = [];
    let page = 0;
    let totalPages = 1;

    while (page < totalPages) {
        const url = `${TRENDYOL_API_BASE}/suppliers/${supplierId}/orders?startDate=${startMs}&endDate=${endMs}&page=${page}&size=200&orderByField=CreatedDate&orderByDirection=DESC`;

        const response = await fetchViaProxy(url, { method: 'GET', headers });
        const text = await response.text();
        const data = JSON.parse(text);

        const content: any[] = data.content || [];
        orders.push(...content);

        // Trendyol bazen totalPages yerine sadece totalElements döner
        if (typeof data.totalElements === 'number' && data.totalElements > 0) {
            totalPages = Math.ceil(data.totalElements / 200);
        } else {
            totalPages = data.totalPages ?? 1;
        }

        page++;
        if (page > 50) break; // Güvenlik limiti (10.000 sipariş/pencere)
    }

    return orders;
};

// ============================================================
// ANA SİPARİŞ ÇEKME FONKSİYONU
// Her çalışmada son 90 günü 15'er günlük 6 pencereyle tarar.
// Pencere yapısı sayesinde hiçbir sipariş atlanmaz.
// ============================================================
export const fetchTrendyolOrders = async (): Promise<{
    success: boolean;
    data?: { content: any[]; totalElements: number };
    message?: string;
}> => {
    const config = getTrendyolConfig();
    if (!config?.isActive) {
        return { success: false, message: 'Entegrasyon aktif değil veya yapılandırılmamış.' };
    }

    const headers = getHeaders(config.apiKey, config.apiSecret, config.supplierId) as Record<string, string>;
    const now = Date.now();
    const DAY = 86400000;

    // Her zaman son 90 günü 15'er günlük pencerelere bölerek tara
    // Bu sayede artımsal/tam geçmiş ayrımı ortadan kalkar ve hiçbir sipariş kaçmaz
    const windows = [
        { start: now - 90 * DAY, end: now - 75 * DAY },
        { start: now - 75 * DAY, end: now - 60 * DAY },
        { start: now - 60 * DAY, end: now - 45 * DAY },
        { start: now - 45 * DAY, end: now - 30 * DAY },
        { start: now - 30 * DAY, end: now - 15 * DAY },
        { start: now - 15 * DAY, end: now },
    ];

    saveSystemLog({
        id: generateId(),
        date: new Date().toISOString(),
        source: 'Trendyol Entegrasyonu',
        type: 'info',
        title: 'Sipariş Taraması Başladı',
        message: `Son 90 gün 6 pencereyle taranıyor (${new Date(windows[0].start).toLocaleDateString('tr-TR')} – ${new Date(now).toLocaleDateString('tr-TR')})`
    });

    const allOrders: any[] = [];
    let successCount = 0;
    let lastError = '';

    for (const win of windows) {
        try {
            const orders = await fetchOrdersInWindow(config.supplierId, headers, win.start, win.end);
            allOrders.push(...orders);
            successCount++;
        } catch (err: any) {
            lastError = err.message;
            console.warn(`[Trendyol] Pencere hatası (${new Date(win.start).toLocaleDateString('tr-TR')}):`, err.message);
            // Proxy bulunamadıysa veya ağ kopuksa devam etmenin anlamı yok
            if (err.message === 'PROXY_NOT_FOUND' || err.message.includes('Failed to fetch')) {
                break;
            }
            // 403 gibi API hataları için de dur
            if (err.message.includes('403')) {
                break;
            }
        }
    }

    // Hiç pencere başarılı olmadıysa — gerçek hata
    if (successCount === 0) {
        saveSystemLog({
            id: generateId(),
            date: new Date().toISOString(),
            source: 'Trendyol Entegrasyonu',
            type: 'error',
            title: 'Bağlantı Başarısız',
            message: lastError || 'Trendyol API\'ye ulaşılamadı.'
        });
        return { success: false, message: lastError || 'Trendyol API\'ye ulaşılamadı.' };
    }

    // Tekrar eden siparişleri orderNumber'a göre temizle
    const unique = Array.from(
        new Map(allOrders.map(o => [String(o.orderNumber), o])).values()
    );

    // Sync zamanını güncelle
    saveTrendyolSyncState({ lastSyncedAt: now });

    saveSystemLog({
        id: generateId(),
        date: new Date().toISOString(),
        source: 'Trendyol Entegrasyonu',
        type: 'success',
        title: 'Senkronizasyon Tamamlandı',
        message: `${unique.length} benzersiz sipariş alındı (${successCount}/6 pencere başarılı).`
    });

    return {
        success: true,
        data: { content: unique, totalElements: unique.length }
    };
};


// ============================================================
// ÜRÜN ÇEKME — Trendyol'daki ürünleri getir
// ============================================================
export const fetchTrendyolProducts = async (): Promise<{
    success: boolean;
    data?: any;
    message?: string;
}> => {
    const config = getTrendyolConfig();
    if (!config?.isActive) {
        return { success: false, message: 'Entegrasyon aktif değil.' };
    }

    const headers = getHeaders(config.apiKey, config.apiSecret, config.supplierId) as Record<string, string>;
    const allProducts: any[] = [];
    let page = 0;
    let totalPages = 1;

    saveSystemLog({
        id: generateId(),
        date: new Date().toISOString(),
        source: 'Trendyol Entegrasyonu',
        type: 'info',
        title: 'Ürün Listesi Çekiliyor',
        message: 'Trendyol ürün kataloğu alınıyor...'
    });

    try {
        while (page < totalPages) {
            const url = `${TRENDYOL_API_BASE}/suppliers/${config.supplierId}/products?page=${page}&size=200&approved=true`;
            const response = await fetchViaProxy(url, { method: 'GET', headers });
            const text = await response.text();
            const data = JSON.parse(text);

            allProducts.push(...(data.content || []));
            totalPages = data.totalPages ?? 1;
            page++;
            if (page > 100) break;
        }

        saveSystemLog({
            id: generateId(),
            date: new Date().toISOString(),
            source: 'Trendyol Entegrasyonu',
            type: 'success',
            title: 'Ürünler Alındı',
            message: `${allProducts.length} ürün çekildi.`
        });

        return {
            success: true,
            data: { content: allProducts, totalElements: allProducts.length }
        };

    } catch (err: any) {
        const isLocal = err.message === 'PROXY_NOT_FOUND' || err.message.includes('Failed to fetch');
        saveSystemLog({
            id: generateId(),
            date: new Date().toISOString(),
            source: 'Trendyol Entegrasyonu',
            type: 'warning',
            title: isLocal ? 'Simülasyon Modu' : 'Ürün Çekme Hatası',
            message: err.message
        });

        return {
            success: isLocal,
            data: isLocal ? getMockTrendyolData() : undefined,
            message: err.message
        };
    }
};

// ============================================================
// STOK GÜNCELLEME
// ============================================================
export const updateStock = async (
    config: any,
    items: { barcode: string; quantity: number }[]
): Promise<{ success: boolean; message: string }> => {
    const headers = getHeaders(config.apiKey, config.apiSecret, config.supplierId) as Record<string, string>;
    const url = `${TRENDYOL_API_BASE}/suppliers/${config.supplierId}/products/price-and-inventory`;

    try {
        const response = await fetchViaProxy(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ items: items.map(i => ({ barcode: i.barcode, quantity: i.quantity })) })
        });
        const text = await response.text();
        return { success: true, message: text };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

// ============================================================
// FİYAT GÜNCELLEME
// ============================================================
export const updatePrice = async (
    config: any,
    items: { barcode: string; salePrice: number; listPrice: number }[]
): Promise<{ success: boolean; message: string }> => {
    const headers = getHeaders(config.apiKey, config.apiSecret, config.supplierId) as Record<string, string>;
    const url = `${TRENDYOL_API_BASE}/suppliers/${config.supplierId}/products/price-and-inventory`;

    try {
        const response = await fetchViaProxy(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ items })
        });
        const text = await response.text();
        return { success: true, message: text };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

// ============================================================
// BAĞLANTI TESTİ
// ============================================================
export const testConnection = async (config: any): Promise<{ success: boolean; message: string }> => {
    try {
        const headers = getHeaders(config.apiKey, config.apiSecret, config.supplierId) as Record<string, string>;
        const url = `${TRENDYOL_API_BASE}/suppliers/${config.supplierId}/addresses`;
        const response = await fetchViaProxy(url, { method: 'GET', headers });
        await response.text();
        return { success: true, message: 'Bağlantı başarılı!' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

// ============================================================
// KATEGORİ ÖZELLİKLERİ (yeni ürün ekleme için)
// ============================================================
export const fetchCategoryAttributes = async (categoryId: number): Promise<{
    success: boolean;
    data?: any;
    message?: string;
}> => {
    const config = getTrendyolConfig();
    if (!config?.isActive) return { success: false, message: 'Entegrasyon aktif değil.' };

    const headers = getHeaders(config.apiKey, config.apiSecret, config.supplierId) as Record<string, string>;

    try {
        const url = `${TRENDYOL_API_BASE}/product-categories/${categoryId}/attributes`;
        const response = await fetchViaProxy(url, { method: 'GET', headers });
        const text = await response.text();
        return { success: true, data: JSON.parse(text) };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

// ============================================================
// KATEGORİ LİSTESİ
// ============================================================
export const fetchCategories = async (): Promise<{
    success: boolean;
    data?: any[];
    message?: string;
}> => {
    const config = getTrendyolConfig();
    if (!config?.isActive) return { success: false, message: 'Entegrasyon aktif değil.' };

    const headers = getHeaders(config.apiKey, config.apiSecret, config.supplierId) as Record<string, string>;

    try {
        const url = `${TRENDYOL_API_BASE}/product-categories`;
        const response = await fetchViaProxy(url, { method: 'GET', headers });
        const text = await response.text();
        const data = JSON.parse(text);
        return { success: true, data: data.categories || data };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

// ============================================================
// SIMÜLASYON VERİLERİ (local/proxy yok durumunda)
// ============================================================
const getMockTrendyolData = () => ({
    totalElements: 3, totalPages: 1, page: 0, size: 10,
    content: [
        {
            id: 'MOCK-001', productCode: 'TS-BLK-L', barcode: '868000000001',
            brand: { name: 'STOKrates' }, title: 'Erkek Parfüm - Black Edition (Simülasyon)',
            categoryName: 'Kozmetik', quantity: 150, salePrice: 450, listPrice: 600,
            vatRate: 20, images: [{ url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=300' }]
        },
        {
            id: 'MOCK-002', productCode: 'TS-WHT-S', barcode: '868000000002',
            brand: { name: 'STOKrates' }, title: 'Kadın Parfüm - White Flowers (Simülasyon)',
            categoryName: 'Kozmetik', quantity: 85, salePrice: 520, listPrice: 700,
            vatRate: 20, images: [{ url: 'https://images.unsplash.com/photo-1594035910387-fea4779426e9?w=300' }]
        }
    ]
});

const getMockTrendyolOrdersData = () => ({
    totalElements: 2, totalPages: 1, page: 0, size: 50,
    content: [
        {
            orderNumber: 'TY-MOCK-001',
            customerFirstName: 'Ahmet', customerLastName: 'Yılmaz',
            totalPrice: 450, shipmentPackageStatus: 'Delivered',
            orderDate: Date.now() - 2 * 86400000,
            lines: [{ merchantSku: 'TS-BLK-L', productName: 'Erkek Parfüm', quantity: 1, amount: 450 }]
        },
        {
            orderNumber: 'TY-MOCK-002',
            customerFirstName: 'Ayşe', customerLastName: 'Kaya',
            totalPrice: 1040, shipmentPackageStatus: 'Created',
            orderDate: Date.now() - 86400000,
            lines: [{ merchantSku: 'TS-WHT-S', productName: 'Kadın Parfüm', quantity: 2, amount: 520 }]
        }
    ]
});