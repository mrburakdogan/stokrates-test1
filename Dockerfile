# Aşama 1: React & Vite projesinin paketlenmesi (Build)
FROM node:20-alpine AS build

WORKDIR /app

# Build-time ortam değişkenleri (Coolify/deployment'tan iletilir)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GEMINI_API_KEY

# ARG'ları env'e koy (Vite erişebilsin)
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Bağımlılık paketlerini kopyalayıp yükle
COPY package*.json ./
RUN npm ci

# Kodları kopyala ve üretim çıktısını al
COPY . .
RUN npm run build

# Aşama 2: Çalıştırma Ekosistemi (Express Sunucu)
FROM node:20-alpine

WORKDIR /app

# Paket tanımlarını kopyala
COPY package*.json ./
# Yalnızca gerekli (production) paketleri kur (Express vb.)
RUN npm ci --only=production

# İlk aşamadan statik derlenmiş UI dosyalarını (dist) kopyala
COPY --from=build /app/dist ./dist

# Sunucu dosyasını kopyala
COPY server.js ./

# Uygulama Portu (Coolify default taraması veya custom belirleme)
EXPOSE 8080

# Sunucuyu başlat
CMD ["node", "server.js"]
