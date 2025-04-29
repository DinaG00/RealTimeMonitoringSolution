const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get all USB logs
router.get('/usb', async (req, res) => {
    try {
        console.log('Fetching USB logs...');
        const logs = await db.allAsync('SELECT * FROM usb_logs ORDER BY timestamp DESC');
        console.log(`Found ${logs.length} USB logs`);
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
        const logs = await db.allAsync('SELECT * FROM process_logs ORDER BY timestamp DESC');
        console.log(`Found ${logs.length} process logs`);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching process logs:', error);
        res.status(500).json({ error: 'Failed to fetch process logs' });
    }
});

// Add USB log
router.post('/usb', async (req, res) => {
    try {
        console.log('Received USB log:', req.body);
        const { pc_id, action } = req.body;
        
        if (!pc_id || !action) {
            console.error('Missing required fields in USB log:', req.body);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log('Inserting USB log with:', { pc_id, action });
        const result = await db.runAsync(
            'INSERT INTO usb_logs (pc_id, action) VALUES (?, ?)',
            [pc_id, action]
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

module.exports = router; 