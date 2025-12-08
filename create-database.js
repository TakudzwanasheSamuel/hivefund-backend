const { Client } = require('pg');
require('dotenv').config();

async function createDatabase() {
  // Connect to PostgreSQL default database (postgres) to create our database
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default postgres database first
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    const dbName = process.env.DATABASE_NAME || 'hive_fund';
    
    // Check if database exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`✅ Database "${dbName}" already exists`);
    } else {
      // Create the database
      console.log(`Creating database "${dbName}"...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database "${dbName}" created successfully!`);
    }

    // Now connect to the new database to create extensions
    await client.end();
    
    const hiveClient = new Client({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: dbName,
    });

    await hiveClient.connect();
    console.log(`✅ Connected to "${dbName}" database`);

    // Create UUID extension
    console.log('Creating UUID extension...');
    await hiveClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension created');

    await hiveClient.end();
    console.log('\n✨ Database setup complete!');
    console.log('You can now start the server with: npm run start:dev');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    process.exit(1);
  }
}

createDatabase();

