"""
Database setup script for AI Vision Architecture
This script creates the MySQL database and applies the schema
"""

import os
import sys
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load environment variables from db/.env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

# Get database configuration from environment variables
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
}

DB_NAME = os.getenv('DB_NAME', 'digitalnexusai_emc_db')
SQL_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'create_all.sql')

def create_database():
    """Create database and apply schema"""
    connection = None
    
    try:
        # Connect to MySQL server (without database)
        print(f"[INFO] Connecting to MySQL server at {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        connection = mysql.connector.connect(**DB_CONFIG)
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # Check if database exists
            cursor.execute(f"SHOW DATABASES LIKE '{DB_NAME}'")
            result = cursor.fetchone()
            
            if result:
                print(f"[INFO] Database '{DB_NAME}' already exists")
            else:
                # Create database
                print(f"[INFO] Creating database '{DB_NAME}'")
                cursor.execute(f"CREATE DATABASE `{DB_NAME}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                print(f"[OK] Database '{DB_NAME}' created successfully")
            
            # Switch to the database
            cursor.execute(f"USE `{DB_NAME}`")
            
            # Read SQL file
            print(f"[INFO] Reading SQL file: {SQL_FILE}")
            with open(SQL_FILE, 'r') as file:
                sql_script = file.read()
            
            # Split SQL commands by semicolon
            sql_commands = sql_script.split(';')
            
            # Execute SQL commands
            print("[INFO] Executing SQL commands...")
            for command in sql_commands:
                command = command.strip()
                if command:
                    try:
                        cursor.execute(command)
                        print(".", end='', flush=True)
                    except Error as e:
                        print(f"\n[ERROR] Error executing SQL command: {e}")
            
            # Commit changes
            connection.commit()
            print("\n[OK] Database schema applied successfully")
            
            # Check if tables were created
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            print(f"\n[INFO] Tables in database '{DB_NAME}':")
            for table in tables:
                print(f"  - {table[0] if isinstance(table, tuple) else table}")
            
            print("\n[INFO] Database setup complete!")
            return True
            
    except Error as e:
        print(f"[ERROR] MySQL error: {e}")
        return False
        
    finally:
        cursor = None
        if connection and connection.is_connected():
            cursor = connection.cursor()
            cursor.close()
            connection.close()
            print("[INFO] MySQL connection closed")

if __name__ == "__main__":
    success = create_database()
    sys.exit(0 if success else 1)