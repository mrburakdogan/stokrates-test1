import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ES Module ortamında __dirname oluşturma
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Supabase Admin API Setup
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Admin Authentication Middleware
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Yetkisiz erişim (Token yok)' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase Service Role Key sunucuda yapılandırılmamış!' });
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Geçersiz token' });
    if (user.user_metadata?.role !== 'admin') return res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gerekiyor' });
    
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin Endpoints
app.get('/api/users', requireAdmin, async (req, res) => {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return res.status(500).json({ error });
  res.json(users);
});

app.post('/api/users', requireAdmin, async (req, res) => {
  const { email, password, username, role } = req.body;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { role: role || 'user', username },
    email_confirm: true
  });
  if (error) return res.status(400).json({ error });
  res.json(data.user);
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { email, password, username, role } = req.body;
  
  const updates = { email, user_metadata: { username, role } };
  if (password) updates.password = password;
  
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updates);
  if (error) return res.status(400).json({ error });
  res.json(data.user);
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return res.status(400).json({ error });
  res.json({ success: true });
});

// Netlify fonksiyonunu taklit eden (Proxy) Endpoint
app.post('/.netlify/functions/proxy', async (req, res) => {
  try {
    const { url, options } = req.body;
    if (!url) {
      return res.status(400).send("Geçersiz veya eksik hedef URL (Missing URL)");
    }

    const response = await fetch(url, options || {});
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("image")) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.set("Content-Type", contentType);
      res.set("Access-Control-Allow-Origin", "*");
      return res.status(response.status).send(buffer);
    }

    const data = await response.text();
    res.set("Content-Type", contentType || "application/json");
    res.set("Access-Control-Allow-Origin", "*");
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// React proje statik dosyalarını sun (.dist klasörü)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// React Router - Tüm rotaları index.html'e yönlendir (SPA yapısı)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Sunucuyu başlat
app.listen(port, '0.0.0.0', () => {
  console.log(`Uygulama sunucu portunda çalışıyor: ${port}`);
});
