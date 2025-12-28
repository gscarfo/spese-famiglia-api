const express = require('express');

const { Pool } = require('pg');

const cors = require('cors');



const app = express();

app.use(cors());

app.use(express.json());



const pool = new Pool({

  connectionString: ' postgres://postgres:IDkh8ItIIqwCBBCptI93MUE1eVSOkuP7SWPxAJuaRfWq39c1es077MScz3HWNV2o@parallela1.vps.webdock.cloud:5432/postgres'

});



app.get('/', (req, res) => res.send('Backend SpeseFamiglia Online!'));



app.post('/api/sync', async (req, res) => {

  const { transactions } = req.body;

  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    for (const t of transactions) {

      await client.query(

        'INSERT INTO transactions (id, description, amount, date, category, type) VALUES (\$1, \$2, \$3, \$4, \$5, \$6) ON CONFLICT (id) DO NOTHING',

        [t.id, t.description, t.amount, t.date, t.category, t.type]

      );

    }

    await client.query('COMMIT');

    res.status(200).json({ status: 'success', count: transactions.length });

  } catch (e) {

    await client.query('ROLLBACK');

    res.status(500).json({ error: e.message });

  } finally {

    client.release();

  }

});



app.listen(3000, '0.0.0.0', () => console.log('Backend pronto su porta 3000'));
