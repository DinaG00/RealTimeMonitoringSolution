const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get all applications
router.get('/', async (req, res) => {
    try {
        console.log('Fetching all applications...');
        const applications = await db.allAsync(
            'SELECT * FROM application_lists ORDER BY list_type, application_name'
        );
        console.log(`Found ${applications.length} applications`);
        res.json(applications);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// Add new application
router.post('/', async (req, res) => {
    try {
        console.log('Received new application:', req.body);
        const { application_name, list_type } = req.body;
        
        if (!application_name || !list_type) {
            console.error('Missing required fields:', req.body);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['whitelist', 'blacklist'].includes(list_type)) {
            console.error('Invalid list type:', list_type);
            return res.status(400).json({ error: 'Invalid list type' });
        }

        const result = await db.runAsync(
            'INSERT INTO application_lists (application_name, list_type) VALUES (?, ?)',
            [application_name, list_type]
        );
        console.log('Application added with ID:', result.lastID);
        res.status(201).json({ id: result.lastID });
    } catch (error) {
        console.error('Error adding application:', error);
        res.status(500).json({ error: 'Failed to add application' });
    }
});

// Delete application
router.delete('/:id', async (req, res) => {
    try {
        console.log('Deleting application with ID:', req.params.id);
        await db.runAsync('DELETE FROM application_lists WHERE id = ?', [req.params.id]);
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ error: 'Failed to delete application' });
    }
});

// Get blacklist
router.get('/blacklist', async (req, res) => {
    try {
        console.log('Fetching blacklist...');
        const blacklist = await db.allAsync(
            'SELECT application_name FROM application_lists WHERE list_type = ?',
            ['blacklist']
        );
        console.log(`Found ${blacklist.length} blacklisted applications`);
        res.json(blacklist.map(app => app.application_name));
    } catch (error) {
        console.error('Error fetching blacklist:', error);
        res.status(500).json({ error: 'Failed to fetch blacklist' });
    }
});

// Debug route to confirm router is working
router.get('/debug', (req, res) => {
    res.json({ message: 'ApplicationLists router is working' });
});

module.exports = router; 