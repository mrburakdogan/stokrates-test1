# STOKrates Mobile - Expo ile Test Rehberi

Bu rehber, Expo aracılığıyla STOKrates mobil uygulamasını Android ve iOS cihazlarda test etmek için gereken tüm adımları içerir.

## Ön Gereksinimler

### Genel Gerekler
- Node.js 18+ ve npm
- Expo CLI: `npm install -g expo-cli`
- Git

### iOS Testing İçin
- macOS cihaz
- Xcode 15+ (App Store'dan yükle)
- iOS Simulator veya gerçek iPhone

### Android Testing İçin
- Android Studio (emülatör için)
- Android SDK komponentleri
- Gerçek Android cihaz (USB debugging açık)

---

## 1. Kurulum Adımları

### 1.1 Projeyi Hazırla

```bash
# Proje dizinine git
cd stokrates-mobile

# Bağımlılıkları yükle
npm install

# Expo kontrol et
expo --version
```

### 1.2 Expo Go Uygulamasını Yükle
- **iOS**: App Store'dan "Expo Go" ara ve yükle
- **Android**: Google Play Store'dan "Expo Go" ara ve yükle

---

## 2. Development Server Başlat

```bash
npm start
```

Çıktı:
```
Starting dev server with Expo 54.0.33...
Tunnel ready.

To open the app:
  - iOS: Press 'i' or follow the guide at https://docs.expo.dev/build/setup
  - Android: Press 'a' or follow the guide at https://docs.expo.dev/build/setup
```

---

## 3. iOS'ta Test

### 3.1 iOS Simulator'de (Macbook'ta)

```bash
npm run ios
```

**Beklenen sonuç:**
- Simulator otomatik başlar
- App yüklenir ve açılır
- STOKrates uygulaması görünür

### 3.2 Gerçek iPhone'da

#### Seçenek A: Expo Go ile (Hızlı Test)
1. Development server çalışır durumda: `npm start`
2. Terminal'de **QR code** göreceksin
3. iPhone'da Expo Go uygulamasını aç
4. QR code'u scan et
5. App otomatik yüklenir ve açılır

#### Seçenek B: Production Build (App Store'da Yayınlamak İçin)
```bash
# Eas CLI kurulum (gerekli)
npm install -g eas-cli

# Giriş yap
eas login

# Build başlat
eas build --platform ios

# Tamamlanana kadar bekle (10-15 dakika)
# Tamamlandığında QR code göreceksin
```

### 3.3 Debug Modu

```bash
npm start

# Terminal'de 'd' tuşuna bas
# Hata ve log'lar göreceksin
```

---

## 4. Android'te Test

### 4.1 Android Emülatör'de

#### Android Studio Emülatörü Başlaması
```bash
# Android Studio aç
# AVD Manager (Android Virtual Device) aç
# Bir emülatör seç ve "Play" e tıkla
```

#### App'i Emülatöre Yükle
```bash
npm run android
```

**Beklenen sonuç:**
- Build işlemi başlar
- Emülatöre APK yüklenir
- STOKrates uygulaması açılır

### 4.2 Gerçek Android Cihazda

#### 4.2.1 USB Debugging Aç
1. **Ayarlar** → **Geliştirici Seçenekleri**
2. **USB Debugging** kapalı ise aç
3. USB kablosuyla bilgisayara bağla
4. Cihazda "USB Debugging'e izin ver?" sorulursa kabul et

#### 4.2.2 Expo Go ile (Hızlı Test)
```bash
npm start

# Terminal'de USB cihazının bağlı olduğu kontrol et
adb devices

# QR code'u cihazda Expo Go uygulamasıyla scan et
```

#### 4.2.3 Production Build
```bash
eas build --platform android

# Tamamlama sırasında APK indirilebilir
# APK'yi cihaza yükle: adb install app.apk
```

---

## 5. Ortak Test Senaryoları

### 5.1 Kamera İzinleri Test Et
- App açıldığında kamera izni ister
- "Barkod taramak için kamera erişimi gereklidir." mesajı görüntülenecek
- İzin ver/reddet seçeneklerini test et

### 5.2 Offline Modu Test Et
1. Cihazda İnternet kapatılır
2. Uygulamayı kullan
3. Veriler local olarak saklanmalı
4. İnternet geri açılınca senkronize edilir

### 5.3 Storage Test Et
- AsyncStorage bağlantı kontrol
- Geçmiş veriler kaydediliyor mu
- Uygulama kapanıp açıldığında veriler devam ediyor mu

### 5.4 Network İstekleri Test Et
```bash
# Network tab'ini developer tools'da açı
# Supabase API çağrılarını kontrol et
```

---

## 6. Debug & Troubleshooting

### 6.1 Debug Menüsü Aç

**iOS Simulator:**
```
Cmd + D
```

**Android Emülatör:**
```
Cmd + M
```

**Gerçek Cihaz:**
- Uygulamada 3 göz ile yazılmış "Shake" hareketi yap
- Debug menüsü açılacak

### 6.2 Log'ları Görüntüle

```bash
# Dev server'da F12 aç
# JavaScript konsoluna bak
```

### 6.3 Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|-------|-------|
| "qr code yüklenemedi" | WiFi'yi kontrol et, `npm start` yeniden çalıştır |
| Emülatör başlamıyor | Android Studio'yu aç, AVD Manager'dan başlat |
| "Module not found" hatası | `npm install` yeniden çalıştır |
| Hot reload çalışmıyor | `npm start` kapatıp yeniden başla |
| Kamera çalışmıyor | İzinleri kontrol et, simülatör/ gerçek cihazda farklı olabilir |
| iOS build başarısız | `eas build --platform ios --profile preview` dene |

---

## 7. Build Profilleri

### 7.1 Preview Build (Development)
```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```
- Daha hızlı build
- Debug yapılabilir
- Simulator'de test edilebilir

### 7.2 Production Build
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```
- Optimize edilmiş
- Min size
- App Store/Play Store'a yayınlanmaya hazır

---

## 8. Continuous Testing Setup

### 8.1 CI/CD Pipeline
```bash
# eas.json de bulunan config'ler kontrol:
cat eas.json
```

### 8.2 Automation Testing
```bash
# Detox kurulumunu düşün (React Native otomasyonu)
npm install detox-cli --save-dev
```

---

## 9. Performance Testing

### 9.1 Bundle Size Kontrol
```bash
npm run android -- --release
npm run ios -- --release
```

### 9.2 Memory Profiling
- React DevTools aç (npm start → shift + m)
- Profiler tab'ında işlemler izle

### 9.3 Network Throttling
- Chrome DevTools → Network → throttling
- Yavaş internet simüle et

---

## 10. Publishing

### 10.1 EAS Update (OTA Update)
```bash
eas update --message "Bug fix for camera"
```

### 10.2 Play Store/App Store
```bash
# Gcloud credentials kur
eas submit --platform ios
eas submit --platform android
```

---

## Faydalı Linkler

- [Expo Docs](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo Go](https://docs.expo.dev/get-started/expo-go/)
- [Debugging](https://docs.expo.dev/debugging/runtime-issues/)

---

## Notlar

- **Development mode**: Hot reload etkindir, değişiklikler anında görülür
- **Offline support**: AsyncStorage ve NetInfo plugins yapılandırılmıştır
- **Kamera**: Adaptive icon ve permissions konfigüre edilmiştir
- **Roller**: iOS (bundle: `com.stokrates.mobile`) ve Android (package: `com.stokrates.mobile`)
