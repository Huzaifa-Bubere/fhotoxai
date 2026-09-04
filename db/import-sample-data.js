#!/usr/bin/env node

/**
 * Script to import sample data into the database
 * 
 * This script reads the sample_data.sql file and executes the SQL statements
 * to populate the database with sample events, users, and associations.
 * 
 * Usage: node import-sample-data.js
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_vision_db',
  multipleStatements: true // Important for executing multiple SQL statements
};

// Path to the sample data SQL file
const sampleDataPath = path.resolve(__dirname, 'sample_data.sql');

async function importSampleData() {
  console.log('Starting sample data import...');
  console.log(`Reading sample data from ${sampleDataPath}`);
  
  // Check if the file exists
  if (!fs.existsSync(sampleDataPath)) {
    console.error(`Error: Sample data file not found at ${sampleDataPath}`);
    process.exit(1);
  }
  
  // Read the SQL file
  const sql = fs.readFileSync(sampleDataPath, 'utf8');
  
  let connection;
  try {
    // Create connection
    console.log('Connecting to database...');
    console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`User: ${dbConfig.user}`);
    console.log(`Database: ${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Execute the SQL statements
    console.log('Executing sample data queries...');
    const [results] = await connection.query(sql);
    
    console.log('Sample data imported successfully!');
    console.log(`Added: ${results.length} result sets`);
    
    // Log summary of imported data
    const tables = ['users', 'events', 'user_events', 'photos'];
    for (const table of tables) {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${rows[0].count} records`);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing sample data:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Execute the function
importSampleData();