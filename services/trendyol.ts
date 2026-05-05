import { getTrendyolConfig, saveTrendyolSyncState, getTrendyolSyncState, saveSystemLog, generateId } from './db';

const TRENDYOL_API_BASE = 'https://api.trendyol.com/sapigw';

// ============================================================
// YETKİLENDİRME
// ============================================================
const getHeaders = (apiKey: string, apiSecret: string, supplierId: string) => {
    const authString = btoa(`${apiKey}:${apiSecret}`);
    return {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `${supplierId} - SelfIntegration`,
        'Accept-Language': 'tr-TR,tr;q=0.9'
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

        // Trendyol bazen totalPages yerine totalElements döner
        if (typeof data.totalElements === 'number' && data.totalElements > 0) {
            totalPages = Math.ceil(data.totalElements / 200);
        } else {
            totalPages = data.totalPages ?? 1;
        }

        page++;
        if (page > 50) break; // Güvenlik limiti
    }

    return orders;
};

// ============================================================
// ANA SİPARİŞ ÇEKME FONKSİYONU — ARTIMSAL YAPI
//
// Mimari:
//   - Geçmiş siparişler → her zaman DB'den okunur (getSales)
//   - Bu fonksiyon yalnızca YENİ siparişleri Trendyol'dan çeker
//
// Çalışma mantığı:
//   İlk çalışma (lastSyncedAt yok) → son 7 günü çek
//   Sonraki çalışmalar             → lastSyncedAt - 1 saat arası (overlap)
//
// endDate = now + 1 gün:
//   UTC+3 farkı nedeniyle Türkiye saatiyle bugün alınan siparişlerin
//   kaçmaması için endDate her zaman biraz ileriye alınır.
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
    const syncState = getTrendyolSyncState();
    const now = Date.now();
    const DAY = 86400000;
    const HOUR = 3600000;

    // endDate: şimdiden 1 gün ilerisi — UTC+3 saat farkını absorbe eder
    const endDate = now + DAY;

    // startDate: ilk çalışmada son 7 gün, sonrasında son sync'ten 1 saat öncesi
    const isFirstRun = !syncState?.lastSyncedAt;
    const startDate = isFirstRun
        ? now - 7 * DAY
        : syncState!.lastSyncedAt - HOUR;

    saveSystemLog({
        id: generateId(),
        date: new Date().toISOString(),
        source: 'Trendyol Entegrasyonu',
        type: 'info',
        title: isFirstRun ? 'İlk Sipariş Çekimi (7 gün)' : 'Yeni Sipariş Kontrolü',
        message: `${new Date(startDate).toLocaleString('tr-TR')} → ${new Date(endDate).toLocaleString('tr-TR')}`
    });

    try {
        const orders = await fetchOrdersInWindow(config.supplierId, headers, startDate, endDate);

        // Dedup — güvenlik için
        const unique = Array.from(
            new Map(orders.map(o => [String(o.orderNumber), o])).values()
        );

        // Başarılı çekim → sync zamanını güncelle
        saveTrendyolSyncState({ lastSyncedAt: now });

        saveSystemLog({
            id: generateId(),
            date: new Date().toISOString(),
            source: 'Trendyol Entegrasyonu',
            type: 'success',
            title: 'Yeni Siparişler Alındı',
            message: `${unique.length} sipariş döndü. Yeni olanlar DB'ye işlenecek.`
        });

        return { success: true, data: { content: unique, totalElements: unique.length } };

    } catch (err: any) {
        saveSystemLog({
            id: generateId(),
            date: new Date().toISOString(),
            source: 'Trendyol Entegrasyonu',
            type: 'error',
            title: 'Sipariş Çekme Hatası',
            message: err.message
        });
        return { success: false, message: err.message };
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
// KATEGORİ ÖZELLİKLERİ
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