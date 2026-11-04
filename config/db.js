import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn('⚠️ MONGODB_URI is not set in environment variables.');
}

let client = null;
let db = null;
let connectionPromise = null;

/**
 * Connect to MongoDB and cache the client and database reference
 */
export async function connectToDatabase() {
  if (db && client) {
    return { client, db };
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/urbandrainx';

  connectionPromise = (async () => {
    try {
      client = new MongoClient(mongoUri, {
        maxPoolSize: 50,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 15000,
        directConnection: true,
      });

      await client.connect();

      // Extract DB name if provided in URI or default to urbandrainx
      const parsedUrl = new URL(mongoUri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
      const dbNameFromUri = parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : '';
      const databaseName = dbNameFromUri || 'urbandrainx';

      db = client.db(databaseName);

      console.log(`✅ MongoDB connected successfully to database: [${databaseName}]`);
      return { client, db };
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
      connectionPromise = null;
      throw err;
    }
  })();

  return connectionPromise;
}

/**
 * Get current database instance (auto-connects if necessary)
 */
export async function getDb() {
  if (db) return db;
  const conn = await connectToDatabase();
  return conn.db;
}

/**
 * Proxy object that allows routes to call `db.collection('...')` directly
 */
export const dbProxy = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'then') {
      return undefined;
    }
    if (db && typeof db[prop] === 'function') {
      return db[prop].bind(db);
    }
    if (db && prop in db) {
      return db[prop];
    }
    // For lazy collection access before async connect completes:
    if (prop === 'collection') {
      return (colName) => {
        if (db) return db.collection(colName);
        throw new Error(`Database not initialized yet. Ensure connectToDatabase() is called at startup.`);
      };
    }
    return undefined;
  }
});

/**
 * Test database connection
 * @returns {Promise<object>} Connection test result
 */
export async function testConnection() {
  try {
    const database = await getDb();
    const pingResult = await database.command({ ping: 1 });

    return {
      success: true,
      connected: pingResult?.ok === 1,
      timestamp: new Date().toISOString(),
      database: database.databaseName,
      message: 'MongoDB connected successfully',
    };
  } catch (error) {
    console.error('[DB-TEST] MongoDB connection test failed:', error.message);
    return {
      success: false,
      connected: false,
      error: error.message,
      message: 'MongoDB connection failed',
    };
  }
}

/**
 * Get current connection status information
 * @returns {object} Status information
 */
export function getPoolStatus() {
  return {
    connected: Boolean(client && db),
    status: client && db ? 'Connected' : 'Disconnected',
    type: 'MongoDB',
    database: db ? db.databaseName : null,
  };
}

/**
 * Graceful shutdown
 */
export async function closePool() {
  console.log('[SHUTDOWN] Closing MongoDB connection...');
  try {
    if (client) {
      await client.close();
      client = null;
      db = null;
      connectionPromise = null;
      console.log('✓ [SHUTDOWN] MongoDB connection closed');
    }
  } catch (error) {
    console.error('❌ [SHUTDOWN] Error closing MongoDB client:', error.message);
  }
}

// Auto-initialize connection in background
connectToDatabase().catch((err) => {
  console.warn('[DB] Initial MongoDB background connection attempt:', err.message);
});

export default dbProxy;
