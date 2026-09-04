// Database connection utility for AI Vision Architecture

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths for different .env files
const defaultEnvPath = path.resolve(__dirname, '.env');
const testEnvPath = path.resolve(__dirname, '.env.test');

// Choose which .env file to use (test, default, or parent directory)
let envPath = defaultEnvPath;
if (fs.existsSync(testEnvPath)) {
  envPath = testEnvPath;
} else if (!fs.existsSync(defaultEnvPath) && fs.existsSync(path.resolve(__dirname, '..', '.env'))) {
  // If no .env in current directory, try parent directory
  envPath = path.resolve(__dirname, '..', '.env');
}

// Load environment variables from the specified path
dotenv.config({ path: envPath });

// Database configuration - mysql2 handles special characters internally
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),  // Default MySQL port
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_vision_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Execute a SQL query with parameters
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters to use in the query
 * @returns {Promise} - The query results
 */
export async function query(sql, params) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database Error:', error.message);
    throw error;
  }
}

/**
 * Get a connection from the pool for transaction support
 * @returns {Promise<Connection>} - A database connection
 */
export async function getConnection() {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Connection Error:', error.message);
    throw error;
  }
}

/**
 * Perform operations within a transaction
 * @param {Function} callback - Function that performs database operations
 * @returns {Promise<any>} - Result from the callback
 */
export async function withTransaction(callback) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('Transaction Error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test the database connection
 * @returns {Promise<boolean>} - True if connection successful
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    console.log('Connected to database:', dbConfig.database);
    console.log('Using user:', dbConfig.user);
    console.log('Host:', dbConfig.host);
    connection.release();
    return true;
  } catch (error) {
    console.error('Failed to connect to the database:', error.message);
    return false;
  }
}

/**
 * Initialize database with schema if tables don't exist
 * @param {string} schemaPath - Path to schema.sql file
 * @returns {Promise<void>}
 */
export async function initializeDatabase(schemaPath) {
  try {
    // Resolve the schema path
    const resolvedSchemaPath = path.resolve(schemaPath);
    console.log(`Initializing database from schema: ${resolvedSchemaPath}`);
    
    // Verify schema file exists
    if (!fs.existsSync(resolvedSchemaPath)) {
      throw new Error(`Schema file not found: ${resolvedSchemaPath}`);
    }
    
    // Read schema file
    const schema = fs.readFileSync(resolvedSchemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement + ';');
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Execute each statement
      for (const statement of statements) {
        await connection.query(statement);
      }
      
      await connection.commit();
      console.log('Database initialized successfully');
    } catch (error) {
      await connection.rollback();
      console.error('Failed to initialize database:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
}

export default {
  query,
  getConnection,
  withTransaction,
  testConnection,
  initializeDatabase
};