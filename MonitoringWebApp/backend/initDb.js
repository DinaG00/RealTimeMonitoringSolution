const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database
const db = new sqlite3.Database('../database/monitoring.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    console.log('Connected to SQLite database.');
});

// Create logs table (rename to usb_logs for clarity)
const createUsbTable = `
CREATE TABLE IF NOT EXISTS usb_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

// Create clipboard logs table
const createClipboardTable = `
CREATE TABLE IF NOT EXISTS clipboard_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

// Create tables
db.serialize(() => {
    db.run(createUsbTable, (err) => {
        if (err) {
            console.error('Error creating USB logs table:', err.message);
        } else {
            console.log('USB logs table created successfully');
        }
    });

    db.run(createClipboardTable, (err) => {
        if (err) {
            console.error('Error creating clipboard logs table:', err.message);
        } else {
            console.log('Clipboard logs table created successfully');
        }
    });

    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
    });
}); 