const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 5001;

// Database path
const dbPath = path.join(__dirname, '..', 'database', 'monitoring.db');

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(bodyParser.json());

// Database connection
let db;
try {
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            console.error('Database connection error:', err.message);
            process.exit(1);
        }
        console.log('Connected to SQLite database at:', dbPath);
        
        db.run('PRAGMA foreign_keys = ON');
        
        initializeDatabase();
    });
} catch (err) {
    console.error('Failed to create database connection:', err);
    process.exit(1);
}

// Initialize database function
function initializeDatabase() {
    const requiredTables = [
        'applications',
        'classrooms',
        'pcs',
        'processes_logs',
        'usb_logs',
        'clipboard_logs',
        'downloads_logs',
        'application_lists'
    ];

    db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'", [], (err, row) => {
        if (err) {
            console.error('Database check error:', err.message);
            process.exit(1);
        }
        
        if (row.count === 0) {
            console.log('No tables found, initializing database...');
            const initSqlPath = path.join(__dirname, '..', 'database', 'init.sql');
            const initSql = require('fs').readFileSync(initSqlPath, 'utf8');
            
            db.serialize(() => {
                db.exec(initSql, (err) => {
                    if (err) {
                        console.error('Database initialization error:', err.message);
                        process.exit(1);
                    }
                    console.log('Database tables initialized.');
                });
            });
        } else {
            // Check if all required tables exist
            const checkTablesQuery = `
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN (${requiredTables.map(() => '?').join(',')})
            `;
            
            db.all(checkTablesQuery, requiredTables, (err, rows) => {
                if (err) {
                    console.error('Error checking required tables:', err.message);
                    process.exit(1);
                }

                const existingTables = rows.map(row => row.name);
                const missingTables = requiredTables.filter(table => !existingTables.includes(table));

                if (missingTables.length > 0) {
                    console.log('Some required tables are missing:', missingTables);
                    console.log('Reinitializing database...');
                    
                    // Drop existing tables
                    const dropTablesQuery = `
                        DROP TABLE IF EXISTS ${existingTables.join(', ')};
                    `;
                    
                    db.exec(dropTablesQuery, (err) => {
                        if (err) {
                            console.error('Error dropping existing tables:', err.message);
                            process.exit(1);
                        }
                        
                        // Initialize database with all tables
                        const initSqlPath = path.join(__dirname, '..', 'database', 'init.sql');
                        const initSql = require('fs').readFileSync(initSqlPath, 'utf8');
                        
                        db.exec(initSql, (err) => {
                            if (err) {
                                console.error('Database initialization error:', err.message);
                                process.exit(1);
                            }
                            console.log('Database tables reinitialized.');
                        });
                    });
                } else {
                    console.log('All required tables exist.');
                }
            });
        }
    });
}

// Insert test data function for debugging
function insertTestData() {
    const testDataPath = path.join(__dirname, '..', 'database', 'test_data.sql');
    const testData = require('fs').readFileSync(testDataPath, 'utf8');
    
    const statements = testData
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
    
    let currentIndex = 0;
    
    function executeNextStatement() {
        if (currentIndex >= statements.length) {
            console.log('Test data insertion completed.');
            return;
        }
        
        const statement = statements[currentIndex];
        db.run(statement, (err) => {
            if (err) {
                console.error(`Error executing statement ${currentIndex + 1}:`, err.message);
                console.error('Statement:', statement);
            }
            currentIndex++;
            executeNextStatement();
        });
    }
    
    executeNextStatement();
}

// Helper function to get or create application
const getOrCreateApplication = async (db, processName) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT id FROM applications WHERE name = ?', [processName], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row) {
                resolve(row.id);
                return;
            }
            
            const displayName = processName.replace('.exe', '');
            db.run(
                'INSERT INTO applications (name, display_name) VALUES (?, ?)',
                [processName, displayName],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.lastID);
                }
            );
        });
    });
};

// Helper function to get/create PC
async function getOrCreatePC(pcName) {
    return new Promise((resolve, reject) => {
        db.get('SELECT id FROM pcs WHERE pc_name = ?', [pcName], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                resolve(row.id);
                return;
            }
            db.run('INSERT INTO pcs (pc_name) VALUES (?)', [pcName], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.lastID);
            });
        });
    });
}

// API to insert USB logs : {pc, device_name, action} or {pc, data}
app.post('/logs/usb', async (req, res) => {
    let { pc, device_name, action, data } = req.body;

    // If device_name or action are missing, try to parse them from 'data'
    if ((!device_name || !action) && data) {
        // Expecting data in the format "DeviceName|Action"
        const parts = data.split('|');
        device_name = device_name || (parts.length > 0 ? parts[0] : "");
        action = action || (parts.length > 1 ? parts[1] : "connected");
    }

    if (!pc || !device_name || !action) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const pcId = await getOrCreatePC(pc);
        const logTimestamp = new Date().toISOString();
        db.run(
            'INSERT INTO usb_logs (pc_id, device_name, action, timestamp) VALUES (?, ?, ?, ?)',
            [pcId, device_name, action, logTimestamp],
            function(err) {
                if (err) {
                    console.error('Error inserting USB log:', err);
                    return res.status(500).json({ error: 'Failed to insert USB log' });
                }
                // Fetch details for notification
                db.get(
                    `SELECT ul.id, ul.timestamp, p.pc_name, ul.device_name, ul.action, ul.pc_id
                     FROM usb_logs ul
                     JOIN pcs p ON ul.pc_id = p.id
                     WHERE ul.id = ?`,
                    [this.lastID],
                    (err, row) => {
                        if (!err && row) {
                            broadcastNotification({
                                type: 'usb_log',
                                logId: row.id,
                                pcId: row.pc_id,
                                pcName: row.pc_name,
                                deviceName: row.device_name,
                                action: row.action,
                                timestamp: row.timestamp
                            });
                        }
                    }
                );
                res.status(201).json({ id: this.lastID });
            }
        );
    } catch (err) {
        console.error('Error in USB log insertion:', err);
        res.status(500).json({ error: 'Failed to process USB log' });
    }
});

// API to fetch USB logs
app.get('/logs/usb', (req, res) => {
    const query = `
        SELECT 
            ul.*,
            p.pc_name,
            p.id as pc_id,
            datetime(ul.timestamp, 'localtime') as local_timestamp
        FROM usb_logs ul
        JOIN pcs p ON ul.pc_id = p.id
        ORDER BY ul.timestamp DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching USB logs:', err);
            return res.status(500).json({ error: 'Failed to fetch USB logs' });
        }
        console.log('Found USB logs:', rows.length);
        res.json(rows);
    });
});

// API to insert clipboard logs
app.post('/logs/clipboard', async (req, res) => {
    const { pc, content } = req.body;
    if (!pc || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const pcId = await getOrCreatePC(pc);
        const logTimestamp = new Date().toISOString();
        db.run(
            'INSERT INTO clipboard_logs (pc_id, content, timestamp) VALUES (?, ?, ?)',
            [pcId, content, logTimestamp],
            function(err) {
                if (err) {
                    console.error('Error inserting clipboard log:', err);
                    return res.status(500).json({ error: 'Failed to insert clipboard log' });
                }
                // Fetch details for notification
                db.get(
                    `SELECT cl.id, cl.timestamp, p.pc_name, cl.content, cl.pc_id
                     FROM clipboard_logs cl
                     JOIN pcs p ON cl.pc_id = p.id
                     WHERE cl.id = ?`,
                    [this.lastID],
                    (err, row) => {
                        if (!err && row) {
                            broadcastNotification({
                                type: 'clipboard_log',
                                logId: row.id,
                                pcId: row.pc_id,
                                pcName: row.pc_name,
                                content: row.content,
                                timestamp: row.timestamp
                            });
                        }
                    }
                );
                res.status(201).json({ id: this.lastID });
            }
        );
    } catch (err) {
        console.error('Error in clipboard log insertion:', err);
        res.status(500).json({ error: 'Failed to process clipboard log' });
    }
});

// API to fetch clipboard logs
app.get('/logs/clipboard', (req, res) => {
    const query = `
        SELECT 
            cl.*,
            p.pc_name,
            p.id as pc_id,
            datetime(cl.timestamp, 'localtime') as local_timestamp
        FROM clipboard_logs cl
        JOIN pcs p ON cl.pc_id = p.id
        ORDER BY cl.timestamp DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching clipboard logs:', err);
            return res.status(500).json({ error: 'Failed to fetch clipboard logs' });
        }
        res.json(rows);
    });
});

// API to insert process logs
app.post('/logs/processes', async (req, res) => {
    const { pc, process_name, window_title, action, start_time, end_time } = req.body;
    if (!pc || !process_name || !action) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const pcId = await getOrCreatePC(pc);
        const applicationId = await getOrCreateApplication(db, process_name);

        // Convert ISO string dates to SQLite format 
        const startTime = start_time ? new Date(start_time).toISOString() : null;
        const endTime = end_time ? new Date(end_time).toISOString() : null;
        const logTimestamp = new Date().toISOString();

        db.run(
            'INSERT INTO processes_logs (pc_id, application_id, action, start_time, end_time, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [pcId, applicationId, action, startTime, endTime, logTimestamp],
            function(err) {
                if (err) {
                    console.error('Error inserting process log:', err);
                    return res.status(500).json({ error: 'Failed to insert process log' });
                }
                // Fetch details for notification
                db.get(
                    `SELECT pl.id, pl.timestamp, p.pc_name, a.display_name, pl.pc_id
                     FROM processes_logs pl
                     JOIN pcs p ON pl.pc_id = p.id
                     JOIN applications a ON pl.application_id = a.id
                     WHERE pl.id = ?`,
                    [this.lastID],
                    (err, row) => {
                        if (!err && row) {
                            broadcastNotification({
                                type: 'process_log',
                                logId: row.id,
                                pcId: row.pc_id,
                                pcName: row.pc_name,
                                appName: row.display_name,
                                timestamp: row.timestamp
                            });
                        }
                    }
                );
                res.status(201).json({ id: this.lastID });
            }
        );
    } catch (err) {
        console.error('Error in process log insertion:', err);
        res.status(500).json({ error: 'Failed to process process log' });
    }
});

// API to fetch process logs
app.get('/logs/process', (req, res) => {
    const query = `
        SELECT 
            pl.*,
            p.pc_name,
            p.id as pc_id,
            a.name as application_name,
            a.display_name as application_display_name,
            datetime(pl.timestamp, 'localtime') as local_timestamp
        FROM processes_logs pl
        JOIN pcs p ON pl.pc_id = p.id
        JOIN applications a ON pl.application_id = a.id
        ORDER BY pl.timestamp DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching process logs:', err);
            return res.status(500).json({ error: 'Failed to fetch process logs' });
        }
        res.json(rows);
    });
});

// API to insert download logs
app.post('/logs/downloads', async (req, res) => {
    const { pc, file_name, file_type, content } = req.body;
    if (!pc || !file_name || !file_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const pcId = await getOrCreatePC(pc);
        const logTimestamp = new Date().toISOString();
        db.run(
            'INSERT INTO downloads_logs (pc_id, file_name, file_type, content, timestamp) VALUES (?, ?, ?, ?, ?)',
            [pcId, file_name, file_type, content || null, logTimestamp],
            function(err) {
                if (err) {
                    console.error('Error inserting download log:', err);
                    return res.status(500).json({ error: 'Failed to insert download log' });
                }
                // Fetch details for notification
                db.get(
                    `SELECT dl.id, dl.timestamp, p.pc_name, dl.file_name, dl.file_type, dl.pc_id
                     FROM downloads_logs dl
                     JOIN pcs p ON dl.pc_id = p.id
                     WHERE dl.id = ?`,
                    [this.lastID],
                    (err, row) => {
                        if (!err && row) {
                            broadcastNotification({
                                type: 'download_log',
                                logId: row.id,
                                pcId: row.pc_id,
                                pcName: row.pc_name,
                                fileName: row.file_name,
                                fileType: row.file_type,
                                timestamp: row.timestamp
                            });
                        }
                    }
                );
                res.status(201).json({ id: this.lastID });
            }
        );
    } catch (err) {
        console.error('Error in download log insertion:', err);
        res.status(500).json({ error: 'Failed to process download log' });
    }
});

// API to fetch download logs
app.get('/logs/downloads', (req, res) => {
    const query = `
        SELECT 
            dl.*,
            p.pc_name,
            p.id as pc_id,
            datetime(dl.timestamp, 'localtime') as local_timestamp
        FROM downloads_logs dl
        JOIN pcs p ON dl.pc_id = p.id
        ORDER BY dl.timestamp DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching download logs:', err);
            return res.status(500).json({ error: 'Failed to fetch download logs' });
        }
        res.json(rows);
    });
});

// API to get all classrooms
app.get('/classrooms', (req, res) => {
    const query = 'SELECT * FROM classrooms ORDER BY name';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching classrooms:', err);
            return res.status(500).json({ error: 'Failed to fetch classrooms' });
        }
        res.json(rows);
    });
});

// API to add a new classroom
app.post('/classrooms', (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Classroom name is required' });
    }

    db.run('INSERT INTO classrooms (name) VALUES (?)', [name], function(err) {
        if (err) {
            console.error('Error adding classroom:', err);
            return res.status(500).json({ error: 'Failed to add classroom' });
        }
        res.status(201).json({ id: this.lastID, name });
    });
});

// API to update a classroom
app.put('/classrooms/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Classroom name is required' });
    }

    db.run('UPDATE classrooms SET name = ? WHERE id = ?', [name, id], function(err) {
        if (err) {
            console.error('Error updating classroom:', err);
            return res.status(500).json({ error: 'Failed to update classroom' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Classroom not found' });
        }
        res.json({ id, name });
    });
});

// API to delete a classroom
app.delete('/classrooms/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM classrooms WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting classroom:', err);
            return res.status(500).json({ error: 'Failed to delete classroom' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Classroom not found' });
        }
        res.json({ message: 'Classroom deleted successfully' });
    });
});

// API to get all PCs
app.get('/pcs', (req, res) => {
    const query = `
        SELECT p.*, c.name as classroom_name 
        FROM pcs p 
        LEFT JOIN classrooms c ON p.classroom_id = c.id 
        ORDER BY p.pc_name
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching PCs:', err);
            return res.status(500).json({ error: 'Failed to fetch PCs' });
        }
        res.json(rows);
    });
});

// API to add a new PC
app.post('/pcs', (req, res) => {
    const { pc_name, classroom_id } = req.body;
    if (!pc_name) {
        return res.status(400).json({ error: 'PC name is required' });
    }

    db.run(
        'INSERT INTO pcs (pc_name, classroom_id) VALUES (?, ?)',
        [pc_name, classroom_id || null],
        function(err) {
            if (err) {
                console.error('Error adding PC:', err);
                return res.status(500).json({ error: 'Failed to add PC' });
            }
            res.status(201).json({ id: this.lastID, pc_name, classroom_id });
        }
    );
});

// API to update a PC
app.put('/pcs/:id', (req, res) => {
    const { id } = req.params;
    const { pc_name, classroom_id } = req.body;

    if (!pc_name) {
        return res.status(400).json({ error: 'PC name is required' });
    }

    db.run(
        'UPDATE pcs SET pc_name = ?, classroom_id = ? WHERE id = ?',
        [pc_name, classroom_id || null, id],
        function(err) {
            if (err) {
                console.error('Error updating PC:', err);
                return res.status(500).json({ error: 'Failed to update PC' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'PC not found' });
            }
            res.json({ id, pc_name, classroom_id });
        }
    );
});

// API to delete a PC
app.delete('/pcs/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM pcs WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting PC:', err);
            return res.status(500).json({ error: 'Failed to delete PC' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'PC not found' });
        }
        res.json({ message: 'PC deleted successfully' });
    });
});

// API to update PC connection status
app.post('/pcs/heartbeat', (req, res) => {
    const { pc_name } = req.body;
    if (!pc_name) {
        return res.status(400).json({ error: 'PC name is required' });
    }

    const now = new Date().toISOString();
    
    // First check if PC exists and get its current status
    db.get('SELECT id, is_connected FROM pcs WHERE pc_name = ?', [pc_name], (err, row) => {
        if (err) {
            console.error('Error checking PC status:', err);
            return res.status(500).json({ error: 'Failed to check PC status' });
        }
        
        if (row) {
            // PC exists, update its status
            const wasOffline = !row.is_connected;
            db.run(
                'UPDATE pcs SET is_connected = 1, last_connection = ? WHERE pc_name = ?',
                [now, pc_name],
                function(err) {
                    if (err) {
                        console.error('Error updating PC status:', err);
                        return res.status(500).json({ error: 'Failed to update PC status' });
                    }
                    
                    // Broadcast status change if PC was offline and is now online
                    if (wasOffline) {
                        broadcastNotification({
                            type: 'pc_status_change',
                            pcId: row.id,
                            pcName: pc_name,
                            status: 'online',
                            timestamp: now
                        });
                    }
                    
                    res.json({ message: 'PC status updated' });
                }
            );
        } else {
            // PC doesn't exist, create it
            db.run(
                'INSERT INTO pcs (pc_name, is_connected, last_connection) VALUES (?, 1, ?)',
                [pc_name, now],
                function(err) {
                    if (err) {
                        console.error('Error creating PC:', err);
                        return res.status(500).json({ error: 'Failed to create PC' });
                    }
                    
                    // Get the newly created PC's ID for broadcasting
                    db.get('SELECT id FROM pcs WHERE pc_name = ?', [pc_name], (err, newRow) => {
                        if (!err && newRow) {
                            broadcastNotification({
                                type: 'pc_status_change',
                                pcId: newRow.id,
                                pcName: pc_name,
                                status: 'online',
                                timestamp: now
                            });
                        }
                    });
                    
                    res.json({ message: 'PC created and status updated' });
                }
            );
        }
    });
});

// API to get all applications (for dropdown)
app.get('/applications', (req, res) => {
    const query = 'SELECT * FROM applications ORDER BY name';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching applications:', err);
            return res.status(500).json({ error: 'Failed to fetch applications' });
        }
        res.json(rows);
    });
});

// API to get application lists (whitelist/blacklist)
app.get('/application-lists', (req, res) => {
    const query = `
        SELECT 
            al.id,
            al.application_id,
            al.list_type,
            al.created_at,
            a.name as application_name,
            a.display_name as application_display_name
        FROM application_lists al
        JOIN applications a ON al.application_id = a.id
        ORDER BY a.name
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching application lists:', err);
            return res.status(500).json({ error: 'Failed to fetch application lists' });
        }
        res.json(rows);
    });
});

// API to add an application to a list
app.post('/application-lists', (req, res) => {
    const { application_id, list_type } = req.body;
    if (!application_id || !list_type) {
        return res.status(400).json({ error: 'Application ID and list type are required' });
    }
    if (!['whitelist', 'blacklist'].includes(list_type)) {
        return res.status(400).json({ error: 'List type must be either whitelist or blacklist' });
    }
    db.run(
        'INSERT INTO application_lists (application_id, list_type) VALUES (?, ?)',
        [application_id, list_type],
        function(err) {
            if (err) {
                console.error('Error adding application to list:', err);
                return res.status(500).json({ error: 'Failed to add application to list' });
            }
            res.status(201).json({ 
                id: this.lastID, 
                application_id,
                list_type 
            });
        }
    );
});

// API to remove an application from a list (by id)
app.delete('/application-lists/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM application_lists WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error removing application from list:', err);
            return res.status(500).json({ error: 'Failed to remove application from list' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Application list entry not found' });
        }
        res.json({ message: 'Application removed from list successfully' });
    });
});

// Endpoint to get blacklist as a list of application names
app.get('/application-lists/blacklist', (req, res) => {
    const query = `
        SELECT a.name
        FROM application_lists al
        JOIN applications a ON al.application_id = a.id
        WHERE al.list_type = 'blacklist'
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching blacklist:', err);
            return res.status(500).json({ error: 'Failed to fetch blacklist' });
        }
        res.json(rows.map(row => row.name));
    });
});

// Endpoint to get all PCs for a given classroom
app.get('/classrooms/:id/pcs', (req, res) => {
    const classroomId = req.params.id;
    const query = `
        SELECT * FROM pcs WHERE classroom_id = ?
    `;
    db.all(query, [classroomId], (err, rows) => {
        if (err) {
            console.error('Error fetching PCs for classroom:', err);
            return res.status(500).json({ error: 'Failed to fetch PCs for classroom' });
        }
        res.json(rows);
    });
});

// Endpoint to get statistics for a classroom
app.get('/classrooms/:id/stats', async (req, res) => {
    const classroomId = req.params.id;
    const { start_time, end_time } = req.query;
    let timeFilter = '';
    if (start_time && end_time) {
        timeFilter = `AND pl.timestamp BETWEEN '${start_time}' AND '${end_time}'`;
    }
    try {
        // Number of PCs assigned
        const pcs = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM pcs WHERE classroom_id = ?', [classroomId], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });
        const pcIds = pcs.map(pc => pc.id);
        const numPCs = pcs.length;
        const numOnline = pcs.filter(pc => pc.is_connected).length;
        const numOffline = numPCs - numOnline;

        // Most recent activity (from all log tables, filtered by time)
        let recentActivity = null;
        if (start_time && end_time) {
            recentActivity = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT MAX(ts) as last_activity FROM (
                        SELECT MAX(timestamp) as ts FROM processes_logs WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'}) AND timestamp BETWEEN '${start_time}' AND '${end_time}'
                        UNION ALL
                        SELECT MAX(timestamp) FROM usb_logs WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'}) AND timestamp BETWEEN '${start_time}' AND '${end_time}'
                        UNION ALL
                        SELECT MAX(timestamp) FROM clipboard_logs WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'}) AND timestamp BETWEEN '${start_time}' AND '${end_time}'
                        UNION ALL
                        SELECT MAX(timestamp) FROM downloads_logs WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'}) AND timestamp BETWEEN '${start_time}' AND '${end_time}'
                    )
                `, [], (err, row) => {
                    if (err) reject(err); else resolve(row.last_activity);
                });
            });
        } else {
            recentActivity = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT MAX(ts) as last_activity FROM (
                        SELECT MAX(timestamp) as ts FROM processes_logs WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})
                        UNION ALL
                        SELECT MAX(timestamp) FROM usb_logs WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})
                        UNION ALL
                        SELECT MAX(timestamp) FROM clipboard_logs WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})
                        UNION ALL
                        SELECT MAX(timestamp) FROM downloads_logs WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})
                    )
                `, [], (err, row) => {
                    if (err) reject(err); else resolve(row.last_activity);
                });
            });
        }

        // Helper for count queries with time filter
        const countTable = async (table) => new Promise((resolve, reject) => {
            let query = `SELECT COUNT(*) as count FROM ${table} WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})`;
            if (start_time && end_time) {
                query += ` AND timestamp BETWEEN '${start_time}' AND '${end_time}'`;
            }
            db.get(query, [], (err, row) => {
                if (err) reject(err); else resolve(row.count);
            });
        });
        const numProcessLogs = await countTable('processes_logs');
        const numUSBLogs = await countTable('usb_logs');
        const numClipboardLogs = await countTable('clipboard_logs');
        const numDownloadLogs = await countTable('downloads_logs');

        // Unique applications launched (name and display_name only, from processes_logs)
        const blacklistedAppsLaunched = await new Promise((resolve, reject) => {
            let query = `
                SELECT DISTINCT a.display_name, a.name
                FROM processes_logs pl
                JOIN applications a ON pl.application_id = a.id
                WHERE pl.pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})
            `;
            if (start_time && end_time) {
                query += ` AND pl.timestamp BETWEEN '${start_time}' AND '${end_time}'`;
            }
            db.all(query, [], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });
        const numUniqueBlacklistedAppsLaunched = blacklistedAppsLaunched.length;

        // Number of app launches (total launches, not unique)
        const numBlacklistedAppLaunches = await new Promise((resolve, reject) => {
            let query = `
                SELECT COUNT(*) as count
                FROM processes_logs pl
                WHERE pl.pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})
            `;
            if (start_time && end_time) {
                query += ` AND pl.timestamp BETWEEN '${start_time}' AND '${end_time}'`;
            }
            db.get(query, [], (err, row) => {
                if (err) reject(err); else resolve(row.count);
            });
        });

        res.json({
            numPCs,
            numOnline,
            numOffline,
            numProcessLogs,
            numUSBLogs,
            numClipboardLogs,
            numDownloadLogs,
            blacklistedAppsLaunched,
            numUniqueBlacklistedAppsLaunched,
            recentActivity,
            numBlacklistedAppLaunches
        });
    } catch (err) {
        console.error('Error fetching classroom stats:', err);
        res.status(500).json({ error: 'Failed to fetch classroom statistics' });
    }
});

// Endpoint to get all process logs for a specific PC
app.get('/pcs/:id/process-logs', (req, res) => {
    const pcId = req.params.id;
    const { start_time, end_time } = req.query;
    let query = `
        SELECT pl.*, a.name as application_name, a.display_name as application_display_name
        FROM processes_logs pl
        JOIN applications a ON pl.application_id = a.id
        WHERE pl.pc_id = ?
    `;
    const params = [pcId];
    if (start_time && end_time) {
        query += ` AND pl.timestamp BETWEEN ? AND ?`;
        params.push(start_time, end_time);
    }
    query += ` ORDER BY pl.timestamp DESC`;
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching process logs for PC:', err);
            return res.status(500).json({ error: 'Failed to fetch process logs for PC' });
        }
        res.json(rows);
    });
});

// Endpoint to get all USB logs for a specific PC
app.get('/pcs/:id/usb-logs', (req, res) => {
    const pcId = req.params.id;
    const { start_time, end_time } = req.query;
    let query = `SELECT * FROM usb_logs WHERE pc_id = ?`;
    const params = [pcId];
    if (start_time && end_time) {
        query += ` AND timestamp BETWEEN ? AND ?`;
        params.push(start_time, end_time);
    }
    query += ` ORDER BY timestamp DESC`;
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching USB logs for PC:', err);
            return res.status(500).json({ error: 'Failed to fetch USB logs for PC' });
        }
        res.json(rows);
    });
});

// Endpoint to get all clipboard logs for a specific PC
app.get('/pcs/:id/clipboard-logs', (req, res) => {
    const pcId = req.params.id;
    const { start_time, end_time } = req.query;
    let query = `SELECT * FROM clipboard_logs WHERE pc_id = ?`;
    const params = [pcId];
    if (start_time && end_time) {
        query += ` AND timestamp BETWEEN ? AND ?`;
        params.push(start_time, end_time);
    }
    query += ` ORDER BY timestamp DESC`;
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching clipboard logs for PC:', err);
            return res.status(500).json({ error: 'Failed to fetch clipboard logs for PC' });
        }
        res.json(rows);
    });
});

// Endpoint to get all download logs for a specific PC
app.get('/pcs/:id/download-logs', (req, res) => {
    const pcId = req.params.id;
    const { start_time, end_time } = req.query;
    let query = `SELECT * FROM downloads_logs WHERE pc_id = ?`;
    const params = [pcId];
    if (start_time && end_time) {
        query += ` AND timestamp BETWEEN ? AND ?`;
        params.push(start_time, end_time);
    }
    query += ` ORDER BY timestamp DESC`;
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching download logs for PC:', err);
            return res.status(500).json({ error: 'Failed to fetch download logs for PC' });
        }
        res.json(rows);
    });
});

// Endpoint to get all USB logs (for all PCs)
app.get('/logs/usb', (req, res) => {
    db.all('SELECT * FROM usb_logs ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch USB logs' });
        res.json(rows);
    });
});

// Endpoint to get all clipboard logs (for all PCs)
app.get('/logs/clipboard', (req, res) => {
    db.all('SELECT * FROM clipboard_logs ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch clipboard logs' });
        res.json(rows);
    });
});

// Endpoint to get all download logs (for all PCs)
app.get('/logs/downloads', (req, res) => {
    db.all('SELECT * FROM downloads_logs ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch download logs' });
        res.json(rows);
    });
});

// Endpoint to get offline detection configuration
app.get('/config/offline-detection', (req, res) => {
    res.json({
        timeoutMinutes: OFFLINE_TIMEOUT_MINUTES,
        checkIntervalMs: OFFLINE_CHECK_INTERVAL_MS
    });
});

// Endpoint to get historical notifications for a classroom within a time period
app.get('/classrooms/:id/notifications', (req, res) => {
    const classroomId = req.params.id;
    const { start_time, end_time } = req.query;
    
    if (!start_time || !end_time) {
        return res.status(400).json({ error: 'Start time and end time are required' });
    }

    try {
        // Get all PCs in the classroom
        db.all('SELECT id FROM pcs WHERE classroom_id = ?', [classroomId], (err, pcs) => {
            if (err) {
                console.error('Error fetching classroom PCs:', err);
                return res.status(500).json({ error: 'Failed to fetch classroom PCs' });
            }

            const pcIds = pcs.map(pc => pc.id);
            if (pcIds.length === 0) {
                return res.json([]);
            }

            // Fetch notifications from all log types for the given time period
            const notifications = [];
            
            // Process logs
            db.all(`
                SELECT 
                    pl.id as logId,
                    pl.timestamp,
                    pl.action,
                    p.pc_name,
                    p.id as pcId,
                    a.display_name as appName,
                    'process_log' as type
                FROM processes_logs pl
                JOIN pcs p ON pl.pc_id = p.id
                JOIN applications a ON pl.application_id = a.id
                WHERE pl.pc_id IN (${pcIds.map(() => '?').join(',')})
                AND pl.timestamp BETWEEN ? AND ?
                ORDER BY pl.timestamp DESC
            `, [...pcIds, start_time, end_time], (err, rows) => {
                if (!err) {
                    notifications.push(...rows);
                }
                
                // USB logs
                db.all(`
                    SELECT 
                        ul.id as logId,
                        ul.timestamp,
                        ul.action,
                        ul.device_name as deviceName,
                        p.pc_name,
                        p.id as pcId,
                        'usb_log' as type
                    FROM usb_logs ul
                    JOIN pcs p ON ul.pc_id = p.id
                    WHERE ul.pc_id IN (${pcIds.map(() => '?').join(',')})
                    AND ul.timestamp BETWEEN ? AND ?
                    ORDER BY ul.timestamp DESC
                `, [...pcIds, start_time, end_time], (err, rows) => {
                    if (!err) {
                        notifications.push(...rows);
                    }
                    
                    // Clipboard logs
                    db.all(`
                        SELECT 
                            cl.id as logId,
                            cl.timestamp,
                            cl.content,
                            p.pc_name,
                            p.id as pcId,
                            'clipboard_log' as type
                        FROM clipboard_logs cl
                        JOIN pcs p ON cl.pc_id = p.id
                        WHERE cl.pc_id IN (${pcIds.map(() => '?').join(',')})
                        AND cl.timestamp BETWEEN ? AND ?
                        ORDER BY cl.timestamp DESC
                    `, [...pcIds, start_time, end_time], (err, rows) => {
                        if (!err) {
                            notifications.push(...rows);
                        }
                        
                        // Download logs
                        db.all(`
                            SELECT 
                                dl.id as logId,
                                dl.timestamp,
                                dl.file_name as fileName,
                                dl.file_type as fileType,
                                dl.content,
                                p.pc_name,
                                p.id as pcId,
                                'download_log' as type
                            FROM downloads_logs dl
                            JOIN pcs p ON dl.pc_id = p.id
                            WHERE dl.pc_id IN (${pcIds.map(() => '?').join(',')})
                            AND dl.timestamp BETWEEN ? AND ?
                            ORDER BY dl.timestamp DESC
                        `, [...pcIds, start_time, end_time], (err, rows) => {
                            if (!err) {
                                notifications.push(...rows);
                            }
                            
                            // Sort all notifications by timestamp (newest first)
                            notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                            
                            res.json(notifications);
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Offline detection configuration
const OFFLINE_TIMEOUT_MINUTES = process.env.OFFLINE_TIMEOUT_MINUTES ? parseInt(process.env.OFFLINE_TIMEOUT_MINUTES) : 2; // Mark PC as offline after X minutes without heartbeat
const OFFLINE_CHECK_INTERVAL_MS = process.env.OFFLINE_CHECK_INTERVAL_MS ? parseInt(process.env.OFFLINE_CHECK_INTERVAL_MS) : 30000; // Check every X milliseconds

// Function to check for offline PCs
function checkOfflinePCs() {
    const timeoutThreshold = new Date(Date.now() - (OFFLINE_TIMEOUT_MINUTES * 60 * 1000)).toISOString();
    
    db.run(
        'UPDATE pcs SET is_connected = 0 WHERE is_connected = 1 AND last_connection < ?',
        [timeoutThreshold],
        function(err) {
            if (err) {
                console.error('Error checking for offline PCs:', err);
            } else if (this.changes > 0) {
                console.log(`Marked ${this.changes} PC(s) as offline due to stale heartbeat`);
                
                // Broadcast offline status to connected clients
                db.all('SELECT id, pc_name FROM pcs WHERE is_connected = 0 AND last_connection < ?', [timeoutThreshold], (err, rows) => {
                    if (!err && rows.length > 0) {
                        rows.forEach(pc => {
                            broadcastNotification({
                                type: 'pc_status_change',
                                pcId: pc.id,
                                pcName: pc.pc_name,
                                status: 'offline',
                                timestamp: new Date().toISOString()
                            });
                        });
                    }
                });
            }
        }
    );
}

// Start periodic offline detection
setInterval(checkOfflinePCs, OFFLINE_CHECK_INTERVAL_MS);

// Start server (use http server for ws)
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcastNotification(notification) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(notification));
        }
    });
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Offline detection enabled: PCs marked offline after ${OFFLINE_TIMEOUT_MINUTES} minutes without heartbeat`);
});
