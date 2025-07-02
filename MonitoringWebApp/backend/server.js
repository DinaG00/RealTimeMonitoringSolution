const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 5001;

// Database path
const dbPath = path.join(__dirname, '..', 'database', 'monitoring.db');

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(bodyParser.json());

// Database connection with better error handling
let db;
try {
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            console.error('Database connection error:', err.message);
            process.exit(1);
        }
        console.log('Connected to SQLite database at:', dbPath);
        
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
        
        // Initialize database if needed
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

// Insert test data function
function insertTestData() {
    const testDataPath = path.join(__dirname, '..', 'database', 'test_data.sql');
    const testData = require('fs').readFileSync(testDataPath, 'utf8');
    
    // Split the SQL file into individual statements
    const statements = testData
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
    
    // Execute statements in sequence
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

// Helper function to get or create PC
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

// API to insert USB logs
app.post('/logs/usb', async (req, res) => {
    const { pc, data, device_name, action } = req.body;
    if (!pc || (!data && !device_name)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const pcId = await getOrCreatePC(pc);
        // If data is "USB device inserted!", use device_name instead
        const deviceName = (data === "USB device inserted!" && device_name) ? device_name : data;
        const deviceAction = "connected"; // Always set to connected for USB insertions
        
        console.log('Received USB log:', { pc, pcId, deviceName, deviceAction });
        
        db.run(
            'INSERT INTO usb_logs (pc_id, device_name, action) VALUES (?, ?, ?)',
            [pcId, deviceName, deviceAction],
            function(err) {
                if (err) {
                    console.error('Error inserting USB log:', err);
                    return res.status(500).json({ error: 'Failed to insert USB log' });
                }
                console.log('Successfully inserted USB log with ID:', this.lastID);
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
        db.run(
            'INSERT INTO clipboard_logs (pc_id, content) VALUES (?, ?)',
            [pcId, content],
            function(err) {
                if (err) {
                    console.error('Error inserting clipboard log:', err);
                    return res.status(500).json({ error: 'Failed to insert clipboard log' });
                }
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

        // Convert ISO string dates to SQLite format if needed
        const startTime = start_time ? new Date(start_time).toISOString() : null;
        const endTime = end_time ? new Date(end_time).toISOString() : null;

        db.run(
            'INSERT INTO processes_logs (pc_id, application_id, action, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
            [pcId, applicationId, action, startTime, endTime],
            function(err) {
                if (err) {
                    console.error('Error inserting process log:', err);
                    return res.status(500).json({ error: 'Failed to insert process log' });
                }
                res.status(201).json({ id: this.lastID });
            }
        );
    } catch (err) {
        console.error('Error in process log insertion:', err);
        res.status(500).json({ error: 'Failed to process process log' });
    }
});

// API to fetch process logs
app.get('/logs/processes', (req, res) => {
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

// Alias for process logs endpoint
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
    const { pc, file_name, file_type, content, timestamp } = req.body;
    if (!pc || !file_name || !file_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const pcId = await getOrCreatePC(pc);
        // Convert timestamp to SQLite format if provided
        const logTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
        
        db.run(
            'INSERT INTO downloads_logs (pc_id, file_name, file_type, content, timestamp) VALUES (?, ?, ?, ?, ?)',
            [pcId, file_name, file_type, content || null, logTimestamp],
            function(err) {
                if (err) {
                    console.error('Error inserting download log:', err);
                    return res.status(500).json({ error: 'Failed to insert download log' });
                }
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
    db.run(
        'UPDATE pcs SET is_connected = 1, last_connection = ? WHERE pc_name = ?',
        [now, pc_name],
        function(err) {
            if (err) {
                console.error('Error updating PC status:', err);
                return res.status(500).json({ error: 'Failed to update PC status' });
            }
            if (this.changes === 0) {
                // If PC doesn't exist, create it
                db.run(
                    'INSERT INTO pcs (pc_name, is_connected, last_connection) VALUES (?, 1, ?)',
                    [pc_name, now],
                    function(err) {
                        if (err) {
                            console.error('Error creating PC:', err);
                            return res.status(500).json({ error: 'Failed to create PC' });
                        }
                        res.json({ message: 'PC created and status updated' });
                    }
                );
            } else {
                res.json({ message: 'PC status updated' });
            }
        }
    );
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

// API to add an application to a list (now using application_id)
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

        // Most recent activity (from all log tables)
        const recentActivity = await new Promise((resolve, reject) => {
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

        // Number of logs per type
        const countTable = async (table) => new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM ${table} WHERE pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})`, [], (err, row) => {
                if (err) reject(err); else resolve(row.count);
            });
        });
        const numProcessLogs = await countTable('processes_logs');
        const numUSBLogs = await countTable('usb_logs');
        const numClipboardLogs = await countTable('clipboard_logs');
        const numDownloadLogs = await countTable('downloads_logs');

        // Most common applications
        const mostCommonApps = await new Promise((resolve, reject) => {
            db.all(`
                SELECT a.display_name, a.name, COUNT(*) as count
                FROM processes_logs pl
                JOIN applications a ON pl.application_id = a.id
                WHERE pl.pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})
                GROUP BY pl.application_id
                ORDER BY count DESC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        // Number of blacklisted app launches
        const numBlacklistedAppLaunches = await new Promise((resolve, reject) => {
            db.get(`
                SELECT COUNT(*) as count
                FROM processes_logs pl
                JOIN application_lists al ON pl.application_id = al.application_id AND al.list_type = 'blacklist'
                WHERE pl.pc_id IN (${pcIds.length ? pcIds.join(',') : 'NULL'})
            `, [], (err, row) => {
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
            mostCommonApps,
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
    const query = `
        SELECT pl.*, a.name as application_name, a.display_name as application_display_name
        FROM processes_logs pl
        JOIN applications a ON pl.application_id = a.id
        WHERE pl.pc_id = ?
        ORDER BY pl.timestamp DESC
    `;
    db.all(query, [pcId], (err, rows) => {
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
    const query = `
        SELECT * FROM usb_logs WHERE pc_id = ? ORDER BY timestamp DESC
    `;
    db.all(query, [pcId], (err, rows) => {
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
    const query = `
        SELECT * FROM clipboard_logs WHERE pc_id = ? ORDER BY timestamp DESC
    `;
    db.all(query, [pcId], (err, rows) => {
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
    const query = `
        SELECT * FROM downloads_logs WHERE pc_id = ? ORDER BY timestamp DESC
    `;
    db.all(query, [pcId], (err, rows) => {
        if (err) {
            console.error('Error fetching download logs for PC:', err);
            return res.status(500).json({ error: 'Failed to fetch download logs for PC' });
        }
        res.json(rows);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
