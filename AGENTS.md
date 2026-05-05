# STOKrates — AGENTS.md

> **AI Agent Talimatı:** Bu dosya, proje hakkında çalışan tüm yapay zeka kod asistanları için birincil bağlam kaynağıdır. **Projeye yeni bir özellik, servis, sayfa, bağımlılık veya önemli konfigürasyon eklendiğinde bu dosya mutlaka güncellenmeli**; güncelleme aşağıdaki `## AGENTS.md Güncelleme Kuralları` bölümündeki kurallara uygun yapılmalıdır.

---

## AGENTS.md Güncelleme Kuralları

Bir agent bu projeye önemli bir değişiklik yapıyorsa **değişikliği commitlemeye geçmeden önce** AGENTS.md dosyasını güncellemeli:

1. **Ne zaman güncellenir?**
   - Yeni bir sayfa (`pages/`) eklenmesi
   - Yeni bir servis (`services/`) eklenmesi
   - Yeni bir harici API/kütüphane entegrasyonu
   - Mevcut servis/mimari değişikliği (ör: veritabanı geçişi)
   - Yeni ortam değişkeni eklenmesi
   - Deployment konfigürasyonu değişikliği
   - Yeni bir global pattern/convention benimsenmesi

2. **Nereye eklenir?**
   - Yeni sayfa → `## Sayfalar` tablosuna satır eklenir, ardından alt bölüme detay eklenir
   - Yeni servis → `## Servis Katmanı` bölümüne eklenir
   - Yeni env var → `## Ortam Değişkenleri` tablosuna satır eklenir
   - Yeni kütüphane → `## Teknoloji Yığını` bölümüne eklenir

3. **Format:** Mevcut belgedeki başlık/tablo/kod bloğu formatına uy. Türkçe açıklamalar kullan.

4. **Kısıtlama yok:** Bu dosyada bir şeyin "mevcut olduğu" belirtilmesi, o şeyin değiştirilemeyeceği anlamına gelmez. Daha iyi bir çözüm gerekliyse mevcut kodu değiştir ve AGENTS.md'yi güncelle.

---

## Proje Özeti

**STOKrates**, Türk KOBİ'leri için geliştirilmiş kapsamlı bir işletme yönetim uygulamasıdır. Müşteri yönetimi (CRM), stok takibi, satış/gider/borç yönetimi, Trendyol entegrasyonu, portföy takibi ve Excel yedekleme gibi özellikleri tek bir SPA içinde sunar.

- **Dil:** Tamamen Türkçe arayüz
- **Hedef Kullanıcı:** Küçük ölçekli perakende/e-ticaret işletmeleri
- **Mimari:** React SPA + Express backend (tek container)
- **Veritabanı:** Supabase (PostgreSQL) — in-memory cache + localStorage yedek ile

---

## Teknoloji Yığını

| Katman | Teknoloji | Versiyon | Notlar |
|---|---|---|---|
| Frontend Framework | React | 19.2.3 | Hooks tabanlı, sınıf component yok |
| Dil | TypeScript | ~5.8.2 | Strict mode, tüm tipler `types.ts`'te |
| Build Tool | Vite | 7.x | Manuel chunk splitting |
| Routing | React Router DOM | 7.x | HashRouter kullanılıyor |
| Backend | Express | 5.x | SPA serve + proxy endpoint |
| Veritabanı | Supabase | ^2.101.1 | `@supabase/supabase-js` |
| AI Entegrasyonu | Google GenAI SDK | ^1.34.0 | `@google/genai`, sadece Portfolio sayfasında |
| Grafikler | Recharts | 2.15.0 | Sabit versiyon — değiştirme |
| İkonlar | Lucide React | ^0.560.0 | |
| Excel | xlsx | latest | Import/export ve tam yedekleme |
| Stil | Tailwind CSS | CDN | `index.html`'e CDN ile bağlı, config dosyası yok |
| Containerization | Docker | multi-stage | Node 20 Alpine |
| Deployment | Coolify + Nixpacks | — | Nixpacks fallback config var |

---

## Proje Dosya Yapısı

```
basit-cari-ve-stok-takip/
│
├── App.tsx                  # Ana uygulama: routing, auth durumu, duyuru sistemi, dark mode
├── index.tsx                # React render giriş noktası
├── types.ts                 # TÜM TypeScript interface ve type tanımları burada
│
├── pages/                   # 19 sayfa bileşeni
│   ├── Dashboard.tsx        # Genel bakış, istatistikler, tarih filtreli raporlar
│   ├── Products.tsx         # Ürün CRUD, stok, fiyat, görsel, tarihçe
│   ├── Customers.tsx        # Müşteri CRUD, arama, sadakat takibi
│   ├── CustomerDetail.tsx   # Tek müşteri profili, işlem geçmişi, indirim kodu
│   ├── NewSale.tsx          # Satış oluşturma/düzenleme, sepet sistemi
│   ├── SalesHistory.tsx     # Satış geçmişi, iade işleme, iptal
│   ├── Expenses.tsx         # Gider CRUD, vergi/reklam takibi, KDV
│   ├── DebtCreditTracking.tsx # Borç/alacak yönetimi
│   ├── Reports.tsx          # Gelişmiş grafikler, karlılık, sadakat analizi
│   ├── CostCalculator.tsx   # Trendyol fiyat hesaplayıcı (iç/ihracat)
│   ├── ProductionCostAnalysis.tsx # Üretim maliyet analizi (parfüm odaklı)
│   ├── TrendyolAnalysis.tsx # Komisyon tarife & avantaj etiketi analizi
│   ├── Portfolio.tsx        # Varlık/portföy yönetimi, Gemini AI fiyat güncelleme
│   ├── Settings.tsx         # Yedekleme, mesaj şablonları, entegrasyonlar, kargo
│   ├── TodoList.tsx         # Görev yönetimi, öncelik, tarih
│   ├── Messages.tsx         # SMS şablonu yönetimi, toplu mesaj gönderimi
│   ├── UserManagement.tsx   # Kullanıcı CRUD (sadece admin)
│   ├── ErrorLogs.tsx        # Sistem log görüntüleyici
│   └── Login.tsx            # Giriş sayfası (username/email + şifre)
│
├── components/
│   ├── Sidebar.tsx          # Ana navigasyon menüsü, responsive
│   ├── SearchableSelect.tsx # Arama destekli dropdown (ürün/müşteri seçimi)
│   └── UserProfileMenu.tsx  # Header kullanıcı menüsü (avatar, profil, çıkış)
│
├── services/
│   ├── db.ts                # ⭐ ANA VERİ KATMANI — in-memory + localStorage + Supabase sync
│   ├── supabase.ts          # Supabase client başlatma (env var'lardan)
│   ├── excel.ts             # Excel import/export, tam sistem yedekleme/geri yükleme
│   └── trendyol.ts          # Trendyol API client (proxy üzerinden)
│
├── server.js                # Express: SPA serve, Netlify proxy endpoint, CORS
├── Dockerfile               # Multi-stage: build (Vite) → runtime (Node+Express)
├── nixpacks.toml            # Coolify/Railway için build+start komutları
├── vite.config.ts           # Vite yapılandırması, chunk splitting
├── tsconfig.json            # TypeScript yapılandırması (vite/client dahil)
└── package.json             # Bağımlılıklar, scripts (dev/build/start/lint)
```

---

## Sayfalar

| Sayfa | Route | Auth | Veri Okuma | Veri Yazma |
|---|---|---|---|---|
| Dashboard | `/` | ✓ | getSales, getExpenses, getCustomers, getProducts | — |
| Products | `/products` | ✓ | getProducts | saveProduct, deleteProduct |
| Customers | `/customers` | ✓ | getCustomers, getSales | saveCustomer, deleteCustomer |
| CustomerDetail | `/customers/:id` | ✓ | getCustomers, getSales | saveCustomer, deleteSale |
| NewSale | `/sales` | ✓ | getCustomers, getProducts, getSales, getPlatforms, getShippingSettings, getTrendyolAnalysisForDate | saveSale |
| NewSale (edit) | `/sales/:id` | ✓ | aynı | saveSale |
| SalesHistory | `/sales-history` | ✓ | getSales, getCustomers, getProducts | cancelSale, deleteSale, saveSale, saveCustomer, processSaleReturn |
| Expenses | `/expenses` | ✓ | getExpenses | saveExpense, deleteExpense |
| DebtCreditTracking | `/debt-credits` | ✓ | getDebtCredits | saveDebtCredit, deleteDebtCredit |
| Reports | `/reports` | ✓ | getSales, getExpenses, getCustomers, getProducts, getShippingSettings | — |
| CostCalculator | `/cost-calculator` | ✓ | getProducts, getShippingSettings | saveTrendyolAnalysis |
| ProductionCostAnalysis | `/production-cost` | ✓ | getProducts | saveProduct |
| TrendyolAnalysis | `/trendyol-analysis` | ✓ | getProducts | saveTrendyolAnalysis, generateId |
| Portfolio | `/portfolio` | ✓ | getAssets, getAssetTransactions, getDebtCredits, getInvestmentCash | saveAsset, deleteAsset, saveAssetTransaction |
| Settings | `/settings` | ✓ | getTemplates, getTrendyolConfig, getShippingSettings, getAnnouncementSettings, getPlatforms, getSystemLogs | save* fonksiyonları |
| TodoList | `/todos` | ✓ | getTodos | saveTodo, deleteTodo |
| Messages | `/messages` | ✓ | getTemplates, getCustomers, getSales, getMessageLogs | saveTemplate, deleteTemplate, saveMessageLog, deleteMessageLog |
| UserManagement | `/users` | admin | getUsers | saveUser, deleteUser |
| ErrorLogs | `/error-logs` | ✓ | getSystemLogs | clearSystemLogs |
| Login | `/login` | — | getUsers | loginUser |

---

## Servis Katmanı

### `services/db.ts` — Ana Veri Katmanı

**Mimari:** In-memory cache (`_store`) + localStorage (offline yedek) + Supabase async sync

```
UI bileşeni → db.ts fonksiyonu → _store güncellenir (anlık)
                              → localStorage güncellenir (anlık)
                              → Supabase sync (arka planda, hata sessizce geçer)
```

**Uygulama açılışında:** `initializeAppData()` çağrılır (App.tsx), Supabase'den tüm koleksiyonlar ve ayarlar yüklenir.

**Koleksiyonlar (app_data tablosu):**
`products`, `customers`, `sales`, `expenses`, `users`, `todos`, `debt_credits`, `msg_templates`, `messages_log`, `system_logs`, `trendyol_analyses`, `platforms`, `assets`, `asset_transactions`

**Ayarlar (app_settings tablosu):**
`trendyol_config`, `shipping_settings`, `announcement_settings`

**Mevcut CRUD Fonksiyonları:**

| Koleksiyon | Okuma | Yazma | Silme |
|---|---|---|---|
| Ürünler | `getProducts()` | `saveProduct(p)` | `deleteProduct(id)` |
| Müşteriler | `getCustomers()` | `saveCustomer(c)` | `deleteCustomer(id)` |
| Satışlar | `getSales()` | `saveSale(s)` | `deleteSale(id)`, `cancelSale(id)` |
| Giderler | `getExpenses()` | `saveExpense(e)` | `deleteExpense(id)` |
| Kullanıcılar | `getUsers()` | `saveUser(u)` | `deleteUser(id)` |
| Yapılacaklar | `getTodos()` | `saveTodo(t)` | `deleteTodo(id)` |
| Borç/Alacak | `getDebtCredits()` | `saveDebtCredit(d)` | `deleteDebtCredit(id)` |
| Mesaj Şablonları | `getTemplates()` | `saveTemplate(t)` | `deleteTemplate(id)` |
| Mesaj Logları | `getMessageLogs()` | `saveMessageLog(l)` | `deleteMessageLog(id)` |
| Sistem Logları | `getSystemLogs()` | `saveSystemLog(l)` | `clearSystemLogs()` |
| Trendyol Analizleri | `getTrendyolAnalyses()`, `getTrendyolAnalysisForDate(date)` | `saveTrendyolAnalysis(r)` | `deleteTrendyolAnalysis(id)` |
| Platformlar | `getPlatforms()` | `savePlatform(p)` | `deletePlatform(id)` |
| Varlıklar | `getAssets()`, `getInvestmentCash()` | `saveAsset(a)`, `saveAssetTransaction(tx)` | `deleteAsset(id)` |

**Yardımcı Fonksiyonlar:**
- `generateId()` → benzersiz ID üretir (Math.random + Date.now tabanlı)
- `initializeAppData()` → async, uygulama başlangıcında bir kez çağrılır
- `getCurrentUser()` / `loginUser(user)` / `logoutUser()` → session yönetimi
- `processSaleReturn(saleId, returns)` → iade işleme + stok güncelleme

> **Yeni koleksiyon eklerken:** `COLLECTIONS` dizisine key ekle, `get/save/delete` fonksiyonlarını aynı pattern'da yaz, Supabase `app_data` tablosu otomatik kullanılır.

---

### `services/supabase.ts` — Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

Tüm Supabase işlemleri bu tek client üzerinden yapılır.

---

### `services/excel.ts` — Excel İşlemleri

**Mevcut fonksiyonlar:**

| Fonksiyon | Açıklama |
|---|---|
| `exportToExcel(products)` | Ürün listesini .xlsx olarak indir |
| `importFromExcel(file)` | .xlsx/.csv'den ürün listesi oku → `Product[]` döner |
| `exportCustomersToExcel(customers, sales)` | Müşteri listesini .xlsx olarak indir |
| `importCustomersFromExcel(file)` | .xlsx/.csv'den müşteri listesi oku |
| `exportFullSystemBackup()` | Tüm localStorage verilerini tek .xlsx dosyasına yaz |
| `importFullSystemBackup(file)` | Yedek .xlsx dosyasından tüm verileri geri yükle |

**Kütüphane:** `xlsx` (SheetJS). Binary array, base64 ve blob işlemleri bu servis üzerinden yapılır.

---

### `services/trendyol.ts` — Trendyol API

**Bağlantı:** Doğrudan Trendyol API'sine istek atılmaz. `server.js`'deki `/.netlify/functions/proxy` endpoint'i üzerinden proxy ile bağlanır (CORS nedeniyle).

**Mevcut fonksiyonlar:**

| Fonksiyon | Açıklama |
|---|---|
| `testConnection(config)` | API bağlantısını test eder |
| `getOrders(config, filters)` | Sipariş listesi çeker |
| `getProducts(config)` | Trendyol'daki ürünleri çeker |
| `updateStock(config, items)` | Stok günceller |
| `updatePrice(config, items)` | Fiyat günceller |

**Config tipi:** `TrendyolConfig` (bkz. `types.ts`)

```typescript
interface TrendyolConfig {
  isActive: boolean;
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  integrationCode?: string;
  token?: string;
  isTestMode: boolean;
  useProxy: boolean;
}
```

> Trendyol entegrasyonu Settings sayfasından yapılandırılır. `useProxy: true` olduğunda istekler Express proxy üzerinden geçer.

---

## Veri Tipleri (`types.ts`)

Tüm TypeScript interface'leri tek dosyada. **Yeni tip eklerken buraya ekle, başka dosyada tanımlama.**

| Interface | Açıklama |
|---|---|
| `User` | id, username, email, password, role ('admin'\|'user'), createdAt |
| `Product` | id, code, barcode, name, brand, category, price, cost, marketPrice, minSalePrice, vatRate, stock, soldCount, desi, images, history |
| `ProductImage` | id, data (base64), fileName, type |
| `ProductHistoryEntry` | id, date, user, type ('create'\|'update'), changes[] |
| `Customer` | id, name, phone, address, discountCode, hasReview, gender |
| `Sale` | id, orderNumber, customerId, customerName, items, subTotal, discount, totalAmount, totalVat, date, status, commissionRate, serviceFee, platformId, shippingCompanyId |
| `SaleItem` | productId, productName, quantity, returnedQuantity, unitPrice, totalPrice, vatRate, vatAmount, analysisCommission |
| `Expense` | id, title, category, amount, vatRate, vatAmount, date, endDate, description, isAd, isTax, isPaid, platform, impressions, clicks, adRevenue |
| `DebtCredit` | id, title, amount, dueDate, type ('debt'\|'credit'), isCompleted, description |
| `Todo` | id, content, priority ('high'\|'medium'\|'low'), estimatedDuration, isCompleted, createdAt, startDate, endDate |
| `Platform` | id, name, defaultCommissionRate, defaultServiceFee |
| `ShippingSettings` | prices (Record<number,number>), defaultPrice, companies (ShippingCompany[]) |
| `TrendyolConfig` | (bkz. yukarıda) |
| `SystemLog` | id, date, source, type ('error'\|'warning'\|'info'\|'success'), title, message, stackTrace |
| `MessageTemplate` | id, title, content |
| `MessageLog` | id, customerId, customerName, phone, templateTitle, content, sentAt, orderNumber |
| `AnnouncementSettings` | isEnabled, todo/stock/tax/debt reminder ayarları, customAnnouncements |
| `TrendyolAnalysisRecord` | id, startDate, endDate, analysisDate, type, products[] |
| `Asset` | id, symbol, name, type ('stock'\|'crypto'\|'commodity'\|'currency'\|'cash'), quantity, purchasePrice, currentPrice, updatedAt |
| `AssetTransaction` | id, assetId, symbol, type ('buy'\|'sell'\|'deposit'\|'withdraw'), quantity, price, total, date, realizedProfit |

---

## Kimlik Doğrulama & Yetkilendirme

**Mekanizma:** localStorage tabanlı session (Supabase Auth kullanılmıyor)

```
localStorage['user_session'] = JSON.stringify(user)  → loginUser(user)
localStorage.removeItem('user_session')               → logoutUser()
getCurrentUser()                                       → User | null
```

**Roller:**
- `admin` → Tüm sayfalara erişir + UserManagement
- `user` → UserManagement dışındaki tüm sayfalara erişir

**Varsayılan admin hesabı** (kullanıcı yoksa otomatik oluşturulur):
- Username: `admin` / Email: `admin@stokrates.com` / Şifre: `123`

**Korumalı route pattern:**
```tsx
<Route path="/users" element={
  currentUser?.role === 'admin'
    ? <UserManagement />
    : <Navigate to="/" replace />
} />
```

---

## Routing

- **Router tipi:** `HashRouter` (URL'de `#` ile — Coolify/nginx uyumluluğu için)
- **Konum:** `App.tsx`
- **Fallback:** `*` → `/` yönlendirir

---

## UI/Stil Gelenekleri

### Tailwind CSS

Config dosyası yoktur. CDN üzerinden `index.html`'de yüklenir. **Tailwind direktif dosyası oluşturma.**

### Dark Mode

```typescript
// App.tsx'te yönetilir
const [isDarkMode, setIsDarkMode] = useState(() => {
  if (localStorage.getItem('theme') === 'dark') return true;
  if (localStorage.getItem('theme') === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});

// HTML root'a class eklenir
document.documentElement.classList.add('dark')
```

Bileşenlerde `dark:` prefix ile koşullu stil: `className="bg-white dark:bg-gray-800"`

### Renk Paleti (Genel)

| Kullanım | Light | Dark |
|---|---|---|
| Sayfa arka plan | `bg-gray-50` / `bg-white` | `dark:bg-gray-900` / `dark:bg-gray-800` |
| Kart/panel | `bg-white border border-gray-100` | `dark:bg-gray-800 dark:border-gray-700` |
| Birincil buton | `bg-blue-600 hover:bg-blue-700 text-white` | aynı |
| Tehlike butonu | `bg-red-500 hover:bg-red-600 text-white` | aynı |
| Input | `border-gray-200 bg-gray-50` | `dark:border-gray-600 dark:bg-gray-700` |
| Başlık metni | `text-gray-800` | `dark:text-white` |
| İkincil metin | `text-gray-500` | `dark:text-gray-400` |

### Modal Pattern

Tüm CRUD modalleri aynı yapıyı izler:

```tsx
{isModalOpen && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
        <h2>{editingId ? 'Düzenle' : 'Yeni Ekle'}</h2>
        <button onClick={handleCloseModal}><X /></button>
      </div>
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* fields */}
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={handleCloseModal}>İptal</button>
          <button type="submit">{editingId ? 'Güncelle' : 'Kaydet'}</button>
        </div>
      </form>
    </div>
  </div>
)}
```

---

## Kod Gelenekleri

### Adlandırma

| Kapsam | Kural | Örnek |
|---|---|---|
| Component dosyaları | PascalCase + .tsx | `NewSale.tsx`, `SearchableSelect.tsx` |
| Servis dosyaları | lowercase + .ts | `db.ts`, `trendyol.ts` |
| State değişkenleri | camelCase, boolean'lar `is/has/show` ile başlar | `isModalOpen`, `hasReview`, `showReminder` |
| Event handler'lar | `handle` prefix | `handleSubmit()`, `handleEdit()`, `handleDelete()` |
| Veri yükleyiciler | `load` prefix | `loadData()`, `loadProducts()` |
| Sabitler | SCREAMING_SNAKE_CASE | `COLLECTIONS`, `COUNTRY_CODES` |
| Props interface | `{BileşenAdı}Props` | `LoginProps`, `SearchableSelectProps` |

### CRUD Sayfası Standart Pattern

Tüm CRUD sayfaları bu pattern'ı izler:

```typescript
const [items, setItems] = useState<T[]>([]);
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
const [formData, setFormData] = useState<FormState>(defaultFormState);

useEffect(() => { loadData(); }, []);

const loadData = () => setItems(getItems());

const handleSubmit = (e) => {
  e.preventDefault();
  saveItem({ id: editingId || generateId(), ...formData });
  loadData();
  handleCloseModal();
};

const handleEdit = (item: T) => {
  setEditingId(item.id);
  setFormData(mapToFormState(item));
  setIsModalOpen(true);
};

const handleDelete = (id: string) => {
  if (window.confirm('Silmek istediğinize emin misiniz?')) {
    deleteItem(id);
    loadData();
  }
};

const handleCloseModal = () => {
  setIsModalOpen(false);
  setEditingId(null);
  setFormData(defaultFormState);
};
```

### ID Üretimi

Yeni kayıt oluştururken daima `generateId()` kullan (`db.ts`'den import et). UUID kütüphanesi yok, Math.random + Date.now tabanlı.

### Hata Yönetimi

- Kullanıcıya gösterilen hatalar: `alert()` veya inline `<div className="text-red-600">` 
- Onay gerektiren işlemler: `window.confirm()`
- Sistem hataları: `saveSystemLog()` ile loglanır
- Supabase hataları: sessizce `console.warn` ile geçilir (uygulama offline çalışmaya devam eder)

### Sistem Loglama

```typescript
import { saveSystemLog, generateId } from '../services/db';

saveSystemLog({
  id: generateId(),
  date: new Date().toISOString(),
  source: 'Trendyol Entegrasyonu',   // kaynak adı
  type: 'error',                      // 'error' | 'warning' | 'info' | 'success'
  title: 'Bağlantı Hatası',
  message: error.message,
  stackTrace: error.stack,            // opsiyonel
});
```

---

## Özel Özellikler

### Stok Otomatik Güncelleme

`saveSale()`, `cancelSale()`, `deleteSale()`, `processSaleReturn()` fonksiyonları stok miktarını otomatik günceller. **Stok değişiklikleri bu fonksiyonlar dışında elle yapılmamalıdır.**

### Ürün Tarihçesi

`saveProduct()`, `name/stock/price/cost/marketPrice/code/category/desi` alanlarındaki değişiklikleri otomatik olarak `product.history[]` dizisine kaydeder. Yeni alan eklemek için `db.ts`'deki `fieldsToTrack` dizisini genişlet.

### SearchableSelect Bileşeni

Ürün ve müşteri seçimi için `components/SearchableSelect.tsx` kullanılır. Stok 0 olan ürünlerde "Stok Yok" etiketi gösterir.

### Duyuru Sistemi

`App.tsx`'te yönetilir. Login'de `checkAnnouncements()` çağrılır. Tür: düşük stok, vadesi gelen todo/vergi/borç, özel duyurular. Frekans: `every_login | once_a_day | once_a_week | once_a_month`.

### Gemini AI Entegrasyonu

Sadece `pages/Portfolio.tsx`'te kullanılır. `@google/genai` SDK ile `GoogleGenAI` sınıfı. API key: `import.meta.env.VITE_GEMINI_API_KEY`.

```typescript
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: `...`,
});
```

### Proxy Endpoint

`server.js`'de `POST /.netlify/functions/proxy` endpoint'i bulunur. Trendyol API isteklerinde CORS sorununu çözmek için kullanılır. Binary (resim) ve text (JSON) yanıtları destekler.

---

## Ortam Değişkenleri

| Değişken | Kapsam | Zorunlu | Açıklama |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Build-time | ✓ | Supabase proje URL'i |
| `VITE_SUPABASE_ANON_KEY` | Build-time | ✓ | Supabase anon/public key |
| `VITE_GEMINI_API_KEY` | Build-time | — | Google Gemini AI, sadece Portfolio için |
| `PORT` | Runtime | — | Express port (varsayılan: 8080) |

> **Coolify'da:** `VITE_` ile başlayan değişkenlerin "Available at Buildtime" kutucuğu işaretli olmalıdır. Aksi hâlde Vite build sırasında `undefined` görür ve bundle'a boş değer gömülür.

---

## Deployment

### Docker (Önerilen)

```dockerfile
# Build stage: VITE_ değişkenleri ARG olarak iletilir
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GEMINI_API_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
# ...
RUN npm run build

# Runtime stage: sadece Express + dist
CMD ["node", "server.js"]
```

### Coolify

- Build Pack: **Dockerfile**
- Port: **8080**
- `VITE_*` değişkenleri → "Available at Buildtime" işaretli

### Express Sunucu (`server.js`)

- CORS etkin
- `/.netlify/functions/proxy` → Trendyol proxy
- `dist/` → statik dosya serve
- `{*splat}` (Express 5 uyumlu) → SPA routing için `index.html`

> **Express 5 Notu:** `app.get('*', ...)` geçersizdir. Express 5'te wildcard `'{*splat}'` yazılır.

### Supabase Tabloları

```sql
CREATE TABLE app_data (
  collection  TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection, item_id)
);

CREATE TABLE app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
```

---

## Sık Yapılan Hatalar

| Hata | Sebep | Çözüm |
|---|---|---|
| Uygulama açılmıyor, boş sayfa | `VITE_*` env var'ları build-time'da yoktu | Coolify'da "Available at Buildtime" işaretle |
| `PathError: Missing parameter name` | Express 5'te `'*'` wildcard | `'{*splat}'` kullan |
| Supabase sync çalışmıyor | Env var eksik veya tablo yok | Tabloları oluştur, env var'ları kontrol et |
| Stok hatalı hesaplanıyor | `saveSale()` dışında stok düzenlendi | Stok işlemlerini sadece db.ts fonksiyonları üzerinden yap |
| Trendyol API 403 | CORS, proxy kullanılmıyor | `TrendyolConfig.useProxy = true` yap |

---

*Bu dosya projenin yaşayan belgesidir. Her önemli değişiklikte güncellenmelidir.*
