const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Debug route to check router mounting
router.get('/', (req, res) => {
    console.log('Logs router root path hit');
    res.json({ message: 'Logs router is working' });
});

// Get all USB logs
router.get('/usb', async (req, res) => {
    try {
        console.log('Fetching USB logs...');
        const logs = await db.allAsync('SELECT * FROM usb_logs ORDER BY timestamp DESC');
        console.log(`Found ${logs.length} USB logs`);
        if (logs.length > 0) {
            console.log('First few logs:', JSON.stringify(logs.slice(0, 3), null, 2));
        }
        res.json(logs);
    } catch (error) {
        console.error('Error fetching USB logs:', error);
        res.status(500).json({ error: 'Failed to fetch USB logs' });
    }
});

// Get all clipboard logs
router.get('/clipboard', async (req, res) => {
    try {
        console.log('Fetching clipboard logs...');
        const logs = await db.allAsync('SELECT * FROM clipboard_logs ORDER BY timestamp DESC');
        console.log(`Found ${logs.length} clipboard logs`);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching clipboard logs:', error);
        res.status(500).json({ error: 'Failed to fetch clipboard logs' });
    }
});

// Get all process logs
router.get('/process', async (req, res) => {
    try {
        console.log('Fetching process logs...');
        console.log('Request path:', req.path);
        console.log('Request baseUrl:', req.baseUrl);
        console.log('Request originalUrl:', req.originalUrl);
        
        const logs = await db.allAsync('SELECT * FROM process_logs ORDER BY start_time DESC');
        
        console.log('Query executed successfully');
        console.log(`Found ${logs.length} process logs`);
        if (logs.length > 0) {
            console.log('First few logs:', JSON.stringify(logs.slice(0, 3), null, 2));
        }
        
        res.json(logs);
    } catch (error) {
        console.error('Error fetching process logs:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch process logs' });
    }
});

// Add USB log
router.post('/usb', async (req, res) => {
    try {
        console.log('Received USB log:', req.body);
        const { pc, data } = req.body;
        
        if (!pc) {
            console.error('Missing pc field in USB log:', req.body);
            return res.status(400).json({ error: 'Missing pc field' });
        }

        const hardcodedAction = "USB device inserted!";
        console.log('Inserting USB log with:', { pc, action: hardcodedAction });
        const result = await db.runAsync(
            'INSERT INTO usb_logs (pc, action) VALUES (?, ?)',
            [pc, hardcodedAction]
        );
        console.log('USB log inserted with ID:', result.lastID);
        res.json({ id: result.lastID });
    } catch (error) {
        console.error('Error adding USB log:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to add USB log' });
    }
});

// Add clipboard log
router.post('/clipboard', async (req, res) => {
    try {
        console.log('Received clipboard log:', req.body);
        const { content } = req.body;
        
        if (!content) {
            console.error('Missing content in clipboard log:', req.body);
            return res.status(400).json({ error: 'Missing content' });
        }

        const result = await db.runAsync(
            'INSERT INTO clipboard_logs (content) VALUES (?)',
            [content]
        );
        console.log('Clipboard log inserted with ID:', result.lastID);
        res.json({ id: result.lastID });
    } catch (error) {
        console.error('Error adding clipboard log:', error);
        res.status(500).json({ error: 'Failed to add clipboard log' });
    }
});

// Add process log
router.post('/process', async (req, res) => {
    try {
        console.log('Received process log:', req.body);
        const { process_name, window_title, action, start_time, end_time } = req.body;
        
        if (!process_name || !window_title || !action) {
            console.error('Missing required fields in process log:', req.body);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log('Inserting process log with:', { process_name, window_title, action, start_time, end_time });
        const result = await db.runAsync(
            'INSERT INTO process_logs (process_name, window_title, action, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
            [process_name, window_title, action, start_time, end_time]
        );
        console.log('Process log inserted with ID:', result.lastID);
        res.json({ id: result.lastID });
    } catch (error) {
        console.error('Error adding process log:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to add process log' });
    }
});

// Add this new route to clear process logs
router.delete('/process', async (req, res) => {
    try {
        console.log('Clearing process logs...');
        await db.runAsync('DELETE FROM process_logs');
        console.log('Process logs cleared successfully');
        res.json({ message: 'Process logs cleared successfully' });
    } catch (error) {
        console.error('Error clearing process logs:', error);
        res.status(500).json({ error: 'Failed to clear process logs' });
    }
});

// Download logs endpoints
router.get('/downloads', async (req, res) => {
    console.log('Fetching download logs...');
    try {
        const logs = await db.all(`
            SELECT 
                id,
                pc_id,
                file_name,
                file_type,
                file_size,
                url,
                content,
                timestamp
            FROM download_logs 
            ORDER BY timestamp DESC
        `);
        console.log(`Found ${logs.length} download logs`);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching download logs:', error);
        res.status(500).json({ error: 'Failed to fetch download logs' });
    }
});

router.post('/downloads', async (req, res) => {
    console.log('Received download log:', req.body);
    try {
        const { pc, file_name, file_type, content, timestamp } = req.body;
        
        if (!pc || !file_name) {
            console.error('Missing required fields:', req.body);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await db.run(`
            INSERT INTO download_logs (
                pc_id,
                file_name,
                file_type,
                content,
                timestamp
            ) VALUES (?, ?, ?, ?, ?)
        `, [pc, file_name, file_type, content, timestamp || new Date().toISOString()]);

        console.log('Download log inserted successfully:', result);
        res.status(201).json({ id: result.lastID });
    } catch (error) {
        console.error('Error inserting download log:', error);
        res.status(500).json({ error: 'Failed to insert download log' });
    }
});

module.exports = router; 