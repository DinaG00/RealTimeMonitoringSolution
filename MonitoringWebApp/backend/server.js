const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 5001;

// Database path
const dbPath = path.join(__dirname, 'database', 'monitoring.db');

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from React frontend
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(bodyParser.json());

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database at:', dbPath);
    
    // Check if tables exist
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='usb_logs'", [], (err, row) => {
        if (err) {
            console.error('Database check error:', err.message);
            process.exit(1);
        }
        
        // If tables don't exist, initialize them
        if (!row) {
            console.log('Tables do not exist, initializing database...');
            const initSqlPath = path.join(__dirname, 'database', 'init.sql');
            db.exec(require('fs').readFileSync(initSqlPath, 'utf8'), (err) => {
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
                            const testDataPath = path.join(__dirname, 'database', 'test_data.sql');
                            db.exec(require('fs').readFileSync(testDataPath, 'utf8'), (err) => {
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

// API to insert download logs
app.post('/logs/downloads', (req, res) => {
    const pc = req.body.pc || req.body.pc_id;
    const { file_name, file_type, content } = req.body;

    console.log("Received download log:", req.body);

    if (!pc || !file_name || !file_type) {
        console.error("Missing required fields in request");
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = `INSERT INTO downloads_logs (pc, file_name, file_type, content, timestamp) 
                 VALUES (?, ?, ?, ?, datetime('now', '+2 hours'))`;
    db.run(sql, [pc, file_name, file_type, content], function (err) {
        if (err) {
            console.error("Database Insert Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("Inserted download log with ID:", this.lastID);
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

// API to fetch download logs
app.get('/logs/downloads', (req, res) => {
    console.log('Fetching download logs...');
    db.all(`
        SELECT 
            id, 
            pc,
            file_name,
            file_type,
            content,
            strftime('%Y-%m-%d %H:%M:%S', datetime(timestamp)) as timestamp
        FROM downloads_logs 
        ORDER BY timestamp DESC
    `, [], (err, rows) => {
        if (err) {
            console.error("Error fetching download logs:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('Found download logs:', rows.length);
        res.json(rows);
    });
});

// API to fetch process logs (alias for /logs/process)
app.get('/logs/process', (req, res) => {
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
            console.error("Error fetching process logs (alias):", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('Found process logs (alias):', rows.length);
        res.json(rows);
    });
});

// API to clear process logs (alias for /logs/process)
app.delete('/logs/process', (req, res) => {
    db.run('DELETE FROM processes_logs', [], function (err) {
        if (err) {
            console.error('Error clearing process logs (alias):', err);
            return res.status(500).json({ error: 'Failed to clear process logs' });
        }
        res.json({ message: 'Process logs cleared successfully' });
    });
});

// --- Application Lists Endpoints ---

// Get all applications
app.get('/application-lists', (req, res) => {
    db.all(
        'SELECT * FROM application_lists ORDER BY list_type, application_name',
        [],
        (err, rows) => {
            if (err) {
                console.error('Error fetching applications:', err);
                return res.status(500).json({ error: 'Failed to fetch applications' });
            }
            res.json(rows);
        }
    );
});

// Add new application
app.post('/application-lists', (req, res) => {
    const { application_name, list_type } = req.body;
    if (!application_name || !list_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['whitelist', 'blacklist'].includes(list_type)) {
        return res.status(400).json({ error: 'Invalid list type' });
    }
    db.run(
        'INSERT INTO application_lists (application_name, list_type) VALUES (?, ?)',
        [application_name, list_type],
        function (err) {
            if (err) {
                console.error('Error adding application:', err);
                return res.status(500).json({ error: 'Failed to add application' });
            }
            res.status(201).json({ id: this.lastID });
        }
    );
});

// Delete application
app.delete('/application-lists/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    console.log('Received delete request for application id:', id);
    if (isNaN(id)) {
        console.error('Invalid id received for deletion:', req.params.id);
        return res.status(400).json({ error: 'Invalid application id' });
    }
    db.run(
        'DELETE FROM application_lists WHERE id = ?',
        [id],
        function (err) {
            if (err) {
                console.error('Error deleting application:', err);
                return res.status(500).json({ error: 'Failed to delete application' });
            }
            if (this.changes === 0) {
                console.warn('No application found with id:', id);
                return res.status(404).json({ error: 'Application not found' });
            }
            res.json({ message: 'Application deleted successfully' });
        }
    );
});

// Get blacklist
app.get('/application-lists/blacklist', (req, res) => {
    db.all(
        'SELECT application_name FROM application_lists WHERE list_type = ?',
        ['blacklist'],
        (err, rows) => {
            if (err) {
                console.error('Error fetching blacklist:', err);
                return res.status(500).json({ error: 'Failed to fetch blacklist' });
            }
            res.json(rows.map(app => app.application_name));
        }
    );
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
