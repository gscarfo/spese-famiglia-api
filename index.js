const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

app.use(cors());
app.use(express.json());

// La variabile d'ambiente DATABASE_URL viene fornita da Coolify
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Inizializzazione automatica della tabella al primo avvio
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY,
        description TEXT,
        amount DECIMAL(12,2),
        date TIMESTAMPTZ,
        category TEXT,
        type TEXT,
        official BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ Database PostgreSQL pronto e tabella verificata.");
  } catch (e) {
    console.error("❌ Errore inizializzazione DB:", e.message);
  }
};
initDb();

// Endpoint per il controllo dello stato (Health Check)
app.get('/health', (req, res) => res.json({ status: 'online', database: 'connected' }));

// Endpoint per la sincronizzazione dei dati dal Frontend
app.post('/api/sync', async (req, res) => {
  const { transactions } = req.body;
  
  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Dati non validi' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of transactions) {
      await client.query(
        'INSERT INTO transactions (id, description, amount, date, category, type, official) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
        [t.id, t.description, t.amount, t.date, t.category, t.type, t.official]
      );
    }
    await client.query('COMMIT');
    res.json({ status: 'ok', saved: transactions.length });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ Errore durante il sync:", e.message);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend in ascolto sulla porta ${PORT}`);
});
