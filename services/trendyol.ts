import { getTrendyolConfig, saveSystemLog, generateId } from './db';

const TRENDYOL_API_BASE = 'https://api.trendyol.com/sapigw';

// --- Authorization ---
const getHeaders = (apiKey: string, apiSecret: string, supplierId: string) => {
    const authString = btoa(`${apiKey}:${apiSecret}`);
    return {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'User-Agent': `${supplierId} - AristokratesApp`
    };
};

// --- PROXY HELPER ---
// Requests are routed through /.netlify/functions/proxy to avoid CORS
const fetchViaProxy = async (targetUrl: string, options: RequestInit = {}) => {
    // Check if we are running on localhost (Vite Dev Server)
    const proxyUrl = '/.netlify/functions/proxy';

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: targetUrl,
                options: options
            })
        });

        // 404 means the Function isn't running (likely localhost without netlify cli)
        if (response.status === 404) {
            throw new Error("PROXY_NOT_FOUND");
        }

        if (!response.ok) {
            throw new Error(`Proxy Error: ${response.statusText}`);
        }

        return response;
    } catch (error: any) {
        throw error;
    }
};

// --- MOCK DATA GENERATOR ---
const getMockTrendyolData = () => {
    return {
        totalElements: 5,
        totalPages: 1,
        page: 0,
        size: 10,
        content: [
            {
                id: "MOCK-001",
                productCode: "TS-BLK-L",
                barcode: "868000000001",
                brand: { name: "Aristokrates" },
                title: "Erkek Parfüm - Black Edition (Simülasyon Verisi)",
                categoryName: "Kozmetik",
                stock: 150,
                salePrice: 450.00,
                listPrice: 600.00,
                vatRate: 20,
                images: [{ url: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=300" }]
            },
            {
                id: "MOCK-002",
                productCode: "TS-WHT-S",
                barcode: "868000000002",
                brand: { name: "Aristokrates" },
                title: "Kadın Parfüm - White Flowers (Simülasyon Verisi)",
                categoryName: "Kozmetik",
                stock: 85,
                salePrice: 520.00,
                listPrice: 700.00,
                vatRate: 20,
                images: [{ url: "https://images.unsplash.com/photo-1594035910387-fea4779426e9?auto=format&fit=crop&q=80&w=300" }]
            },
            {
                id: "MOCK-003",
                productCode: "TS-SMP-KIT",
                barcode: "868000000003",
                brand: { name: "Aristokrates" },
                title: "Tester Seti 5x10ml (Simülasyon Verisi)",
                categoryName: "Kozmetik",
                stock: 20,
                salePrice: 150.00,
                listPrice: 200.00,
                vatRate: 20,
                images: [{ url: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&q=80&w=300" }]
            }
        ]
    };
};

const getMockTrendyolOrdersData = () => {
    return {
        totalElements: 2,
        totalPages: 1,
        page: 0,
        size: 50,
        content: [
            {
                orderNumber: "TY-ORD-001",
                customerFirstName: "Ahmet",
                customerLastName: "Yılmaz",
                totalPrice: 450.00,
                shipmentPackageStatus: "Created",
                lines: [
                    {
                        productCode: "TS-BLK-L",
                        productName: "Erkek Parfüm - Black Edition",
                        quantity: 1,
                        price: 450.00
                    }
                ]
            },
            {
                orderNumber: "TY-ORD-002",
                customerFirstName: "Ayşe",
                customerLastName: "Kaya",
                totalPrice: 1040.00,
                shipmentPackageStatus: "Created",
                lines: [
                    {
                        productCode: "TS-WHT-S",
                        productName: "Kadın Parfüm - White Flowers",
                        quantity: 2,
                        price: 520.00
                    }
                ]
            }
        ]
    };
};


// --- Fetch Products ---
export const fetchTrendyolProducts = async () => {
    const config = getTrendyolConfig();
    
    if (!config || !config.isActive) {
        return { success: false, message: 'Entegrasyon aktif değil veya yapılandırılmamış.' };
    }

    const url = `${TRENDYOL_API_BASE}/suppliers/${config.supplierId}/products?size=20`;

    saveSystemLog({
        id: generateId(),
        date: new Date().toISOString(),
        source: 'Trendyol Entegrasyonu',
        type: 'info',
        title: 'Veri Çekme İsteği',
        message: `Ürün listesi isteniyor...`,
    });

    try {
        // Use our Netlify Proxy Function
        const response = await fetchViaProxy(url, {
            method: 'GET',
            headers: getHeaders(config.apiKey, config.apiSecret, config.supplierId)
        });

        const responseText = await response.text();

        if (!response.ok) {
            throw new Error(`HTTP Hata: ${response.status}. Detay: ${responseText.substring(0, 100)}...`);
        }

        const data = JSON.parse(responseText);
        
        saveSystemLog({
            id: generateId(),
            date: new Date().toISOString(),
            source: 'Trendyol Entegrasyonu',
            type: 'success',
            title: 'Bağlantı Başarılı',
            message: `${data.totalElements || 0} adet ürün bulundu.`,
        });

        return { success: true, data };

    } catch (error: any) {
        console.error("Trendyol Fetch Error:", error);

        // --- FALLBACK LOGIC ---
        // If Proxy is not found (Localhost) or Authorization Fails, show Mock Data for Demo purposes
        
        const errorMessage = error.message || 'Bilinmeyen hata';
        let userMessage = errorMessage;
        let isMock = false;

        // "PROXY_NOT_FOUND" means we are likely running locally with 'npm run dev'
        // The Netlify function doesn't exist on localhost:5173
        if (errorMessage === "PROXY_NOT_FOUND" || errorMessage.includes("Failed to fetch")) {
            userMessage = "Lokal Sunucu Modu: Proxy aktif değil. Netlify'a yüklendiğinde gerçek veri çekilecektir. Şu an simülasyon verisi gösteriliyor.";
            isMock = true;
        } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
             userMessage = "Trendyol Yetki Hatası: API Key ve Secret'ı kontrol ediniz. (Simülasyon verisi gösteriliyor)";
             isMock = true;
        }

        saveSystemLog({
            id: generateId(),
            date: new Date().toISOString(),
            source: 'Trendyol Entegrasyonu',
            type: 'warning',
            title: isMock ? 'Simülasyon Modu Aktif' : 'Bağlantı Hatası',
            message: userMessage,
            stackTrace: error.stack
        });

        // Always return mock data if something fails, so the frontend doesn't break
        return { 
            success: true, 
            data: getMockTrendyolData(),
            message: userMessage
        };
    }
};

// --- Fetch Orders (tüm geçmiş, tüm statüler) ---
export const fetchTrendyolOrders = async () => {
    const config = getTrendyolConfig();

    if (!config || !config.isActive) {
        return { success: false, message: 'Entegrasyon aktif değil veya yapılandırılmamış.' };
    }

    // 6 adet 15 gunluk bagimsiz pencere - toplam 90 gun
    // Her pencere ayri try/catch icinde - birinin hata vermesi digerlerini durdurmaz
    const DAY = 86400000;
    const now = new Date().getTime();
    const windows = [
        { start: now - 90 * DAY, end: now - 75 * DAY, label: '75-90.gun' },
        { start: now - 75 * DAY, end: now - 60 * DAY, label: '60-75.gun' },
        { start: now - 60 * DAY, end: now - 45 * DAY, label: '45-60.gun' },
        { start: now - 45 * DAY, end: now - 30 * DAY, label: '30-45.gun' },
        { start: now - 30 * DAY, end: now - 15 * DAY, label: '15-30.gun' },
        { start: now - 15 * DAY, end: now,             label: '0-15.gun (guncel)' }
    ];

    const allOrders: any[] = [];
    let anyWindowSucceeded = false;
    let lastError = '';

    saveSystemLog({
        id: generateId(),
        date: new Date().toISOString(),
        source: 'Trendyol Entegrasyonu',
        type: 'info',
        title: 'Sipariş Çekme Basladi',
        message: 'Son 90 gunluk siparisler 6 pencereyle cekiliyor...'
    });

    for (const win of windows) {
        // Her pencere bagimsiz try/catch - hata diger pencereleri durdurmaz
        try {
            let page = 0;
            let totalPages = 1;

            while (page < totalPages) {
                const url = `${TRENDYOL_API_BASE}/suppliers/${config.supplierId}/orders?startDate=${win.start}&endDate=${win.end}&page=${page}&size=200`;

                const response = await fetchViaProxy(url, {
                    method: 'GET',
                    headers: getHeaders(config.apiKey, config.apiSecret, config.supplierId)
                });

                const responseText = await response.text();

                if (!response.ok) {
                    console.warn(`[Trendyol] Pencere ${win.label} sayfa ${page} hatasi:`, responseText.substring(0, 200));
                    break;
                }

                const data = JSON.parse(responseText);
                const content: any[] = data.content || [];
                allOrders.push(...content);

                totalPages = data.totalPages || 1;
                page++;

                if (page > 50) break;
            }

            anyWindowSucceeded = true;

        } catch (err: any) {
            lastError = err.message || 'Bilinmeyen hata';
            console.warn(`[Trendyol] Pencere ${win.label} exception:`, lastError);

            if (lastError === 'PROXY_NOT_FOUND' || lastError.includes('Failed to fetch')) {
                break;
            }
        }
    }

    if (!anyWindowSucceeded) {
        const isMock = lastError === 'PROXY_NOT_FOUND' || lastError.includes('Failed to fetch') || lastError.includes('401') || lastError.includes('403');
        const userMessage = isMock
            ? 'Lokal Sunucu Modu: Proxy aktif degil veya yetki hatasi. Simulasyon verisi gosteriliyor.'
            : `Baglanti hatasi: ${lastError}`;

        saveSystemLog({
            id: generateId(),
            date: new Date().toISOString(),
            source: 'Trendyol Entegrasyonu',
            type: 'warning',
            title: isMock ? 'Simulasyon Modu Aktif' : 'Baglanti Hatasi',
            message: userMessage
        });

        return {
            success: true,
            data: getMockTrendyolOrdersData(),
            message: userMessage
        };
    }

    // Duplicate temizleme (farkli pencere araliklarindan ayni siparis gelebilir)
    const unique = Array.from(
        new Map(allOrders.map(o => [String(o.orderNumber), o])).values()
    );

    saveSystemLog({
        id: generateId(),
        date: new Date().toISOString(),
        source: 'Trendyol Entegrasyonu',
        type: 'success',
        title: 'Siparis Cekme Tamamlandi',
        message: `Toplam ${unique.length} benzersiz siparis alindi (${allOrders.length} ham kayit).`
    });

    return {
        success: true,
        data: { content: unique, totalElements: unique.length }
    };
};