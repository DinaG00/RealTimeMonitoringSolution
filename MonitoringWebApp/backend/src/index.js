const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database/db');
const logsRouter = require('./routes/logs');
const applicationListsRouter = require('./routes/applicationLists');

const app = express();
const port = 5001;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// Log all requests with more details
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Request headers:', req.headers);
    console.log('Request path:', req.path);
    console.log('Request baseUrl:', req.baseUrl);
    console.log('Request originalUrl:', req.originalUrl);
    next();
});

// Routes
app.use('/logs', logsRouter);
app.use('/application-lists', applicationListsRouter);

// Add a catch-all route for debugging
app.use('*', (req, res) => {
    console.log('404 - Route not found:', req.originalUrl);
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Database connection established');
}); 