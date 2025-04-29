const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, '../../../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('Created database directory:', dbDir);
}

const dbPath = path.join(dbDir, 'monitoring.db');
console.log('Database path:', dbPath);

// Check if database file exists
const dbExists = fs.existsSync(dbPath);
console.log('Database exists:', dbExists);

const db = new sqlite3.Database(dbPath);

// Initialize database with schema
const schemaPath = path.join(__dirname, 'schema.sql');
const cleanupPath = path.join(__dirname, 'cleanup.sql');
console.log('Schema path:', schemaPath);
console.log('Cleanup path:', cleanupPath);

try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const cleanup = fs.readFileSync(cleanupPath, 'utf8');
    console.log('Schema and cleanup scripts loaded successfully');

    db.serialize(() => {
        // Run schema SQL
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error initializing database:', err);
            } else {
                console.log('Database initialized successfully');
                
                // Run cleanup script
                db.exec(cleanup, (err) => {
                    if (err) {
                        console.error('Error cleaning up database:', err);
                    } else {
                        console.log('Database cleaned up successfully');
                    }
                });
                
                // Verify tables were created
                db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
                    if (err) {
                        console.error('Error checking tables:', err);
                    } else {
                        console.log('Created tables:', tables.map(t => t.name));
                        
                        // Check table structure
                        tables.forEach(table => {
                            db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
                                if (err) {
                                    console.error(`Error checking structure of ${table.name}:`, err);
                                } else {
                                    console.log(`Structure of ${table.name}:`, columns.map(c => c.name));
                                }
                            });
                        });
                    }
                });
            }
        });
    });
} catch (error) {
    console.error('Error reading schema or cleanup file:', error);
}

// Helper functions for database operations
db.runAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

db.allAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = db; 