const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to SQLite database
const db = new sqlite3.Database('./database/monitoring.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
    
    // Check if tables exist
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='usb_logs'", [], (err, row) => {
        if (err) {
            console.error('Database check error:', err.message);
            process.exit(1);
        }
        
        // If tables don't exist, initialize them
        if (!row) {
            console.log('Tables do not exist, initializing database...');
            db.exec(require('fs').readFileSync('./database/init.sql', 'utf8'), (err) => {
                if (err) {
                    console.error('Database initialization error:', err.message);
                    process.exit(1);
                }
                console.log('Database tables initialized.');
                
                // Insert test data only if in development and tables were just created
                if (process.env.NODE_ENV !== 'production') {
                    db.get("SELECT COUNT(*) as count FROM usb_logs", [], (err, row) => {
                        if (err) {
                            console.error('Error checking table data:', err.message);
                        } else if (row.count === 0) {
                            db.exec(require('fs').readFileSync('./database/test_data.sql', 'utf8'), (err) => {
                                if (err) {
                                    console.error('Test data insertion error:', err.message);
                                } else {
                                    console.log('Test data inserted.');
                                }
                            });
                        }
                    });
                }
            });
        } else {
            console.log('Database tables already exist.');
        }
    });
});

// API to insert USB logs
app.post('/logs/usb', (req, res) => {
    // Handle both 'type' and 'pc' fields for backward compatibility
    const pc = req.body.pc || req.body.type;
    const { data } = req.body;

    console.log("Received USB log:", req.body);

    if (!pc || !data) {
        console.error("Missing data in request");
        return res.status(400).json({ error: 'Missing data' });
    }

    // Use explicit timezone offset for Romania (UTC+2)
    const sql = `INSERT INTO usb_logs (pc, data, timestamp) VALUES (?, ?, datetime('now', '+2 hours'))`;
    db.run(sql, [pc, data], function (err) {
        if (err) {
            console.error("Database Insert Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("Inserted USB log with ID:", this.lastID);
        res.json({ id: this.lastID });
    });
});

// API to insert clipboard logs
app.post('/logs/clipboard', (req, res) => {
    const { content, pc } = req.body;

    console.log("Received clipboard log:", req.body);

    if (!content || !pc) {
        console.error("Missing content or PC ID in request");
        return res.status(400).json({ error: 'Missing content or PC ID' });
    }

    // Use explicit timezone offset for Romania (UTC+2)
    const sql = `INSERT INTO clipboard_logs (pc, content, timestamp) VALUES (?, ?, datetime('now', '+2 hours'))`;
    db.run(sql, [pc, content], function (err) {
        if (err) {
            console.error("Database Insert Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("Inserted clipboard log with ID:", this.lastID);
        res.json({ id: this.lastID });
    });
});

// API to insert process logs
app.post('/logs/processes', (req, res) => {
    const { process_name, pc, action, start_time, end_time } = req.body;

    console.log("Received process log:", req.body);

    if (!process_name || !pc) {
        console.error("Missing process name or PC ID in request");
        return res.status(400).json({ error: 'Missing process name or PC ID' });
    }

    const sql = `INSERT INTO processes_logs (pc, process_name, action, start_time, end_time) 
                 VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [pc, process_name, action, start_time, end_time], function (err) {
        if (err) {
            console.error("Database Insert Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("Inserted process log with ID:", this.lastID);
        res.json({ id: this.lastID });
    });
});

// API to fetch USB logs
app.get('/logs/usb', (req, res) => {
    console.log('Fetching USB logs...');
    // Use explicit timezone offset for Romania (UTC+2)
    db.all(`
        SELECT 
            id, 
            pc, 
            data, 
            strftime('%Y-%m-%d %H:%M:%S', datetime(timestamp)) as timestamp 
        FROM usb_logs 
        ORDER BY timestamp DESC
    `, [], (err, rows) => {
        if (err) {
            console.error("Error fetching USB logs:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('Found USB logs:', rows.length);
        res.json(rows);
    });
});

// API to fetch clipboard logs
app.get('/logs/clipboard', (req, res) => {
    console.log('Fetching clipboard logs...');
    // Use explicit timezone offset for Romania (UTC+2)
    db.all(`
        SELECT 
            id, 
            pc,
            content, 
            strftime('%Y-%m-%d %H:%M:%S', datetime(timestamp)) as timestamp 
        FROM clipboard_logs 
        ORDER BY timestamp DESC
    `, [], (err, rows) => {
        if (err) {
            console.error("Error fetching clipboard logs:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('Found clipboard logs:', rows.length);
        res.json(rows);
    });
});

// API to fetch process logs
app.get('/logs/processes', (req, res) => {
    console.log('Fetching process logs...');
    db.all(`
        SELECT 
            id, 
            pc,
            process_name,
            action,
            strftime('%Y-%m-%d %H:%M:%S', datetime(start_time)) as start_time,
            strftime('%Y-%m-%d %H:%M:%S', datetime(end_time)) as end_time
        FROM processes_logs 
        ORDER BY start_time DESC
    `, [], (err, rows) => {
        if (err) {
            console.error("Error fetching process logs:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('Found process logs:', rows.length);
        res.json(rows);
    });
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
