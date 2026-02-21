const express = require('express');
const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup - use persistent volume path if available (Railway)
const dbPath = process.env.DB_PATH || path.join(__dirname, 'oraciones.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS oraciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT NOT NULL,
    fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API: Submit a prayer
app.post('/api/oraciones', (req, res) => {
  const { texto } = req.body;
  if (!texto || !texto.trim()) {
    return res.status(400).json({ error: 'El texto no puede estar vacío' });
  }
  const trimmed = texto.trim().slice(0, 2000);
  const stmt = db.prepare('INSERT INTO oraciones (texto) VALUES (?)');
  stmt.run(trimmed);
  res.json({ ok: true });
});

// API: Get all prayers (for admin)
app.get('/api/oraciones', (req, res) => {
  const rows = db.prepare('SELECT id, texto, fecha FROM oraciones ORDER BY fecha DESC').all();
  res.json(rows);
});

// API: Delete a prayer
app.delete('/api/oraciones/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM oraciones WHERE id = ?').run(id);
  res.json({ ok: true });
});

// API: Generate QR code
app.get('/api/qr', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  try {
    const qr = await QRCode.toDataURL(baseUrl, { width: 400, margin: 2 });
    res.json({ qr, url: baseUrl });
  } catch (err) {
    res.status(500).json({ error: 'Error generando QR' });
  }
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
