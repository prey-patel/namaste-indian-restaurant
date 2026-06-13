const { Client } = require('pg');

const config = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.trccyyalqgsjkuszaqhr',
  password: 'Namaste!!51198',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

async function run() {
  const client = new Client(config);
  try {
    await client.connect();
    
    console.log('--- menu_item_packaging_rules count ---');
    const res = await client.query('SELECT count(*) FROM menu_item_packaging_rules');
    console.log('Count:', res.rows[0].count);

    if (Number(res.rows[0].count) > 0) {
      console.log('Some rows:');
      const rows = await client.query('SELECT * FROM menu_item_packaging_rules LIMIT 5');
      console.log(rows.rows);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}

run();
