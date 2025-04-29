const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database/db');
const logsRouter = require('./routes/logs');

const app = express();
const port = 5001;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/logs', logsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Database connection established');
}); 