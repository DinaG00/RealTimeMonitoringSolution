import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Button, Container, Box, Typography, AppBar, Toolbar } from '@mui/material';
import UsbLogs from './components/UsbLogs';
import ClipboardLogs from './components/ClipboardLogs';

function HomePage() {
    const navigate = useNavigate();

    return (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h3" gutterBottom>
                System Monitoring Dashboard
            </Typography>
            <Box sx={{ mt: 4, display: 'flex', gap: 4, justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => navigate('/usb')}
                    sx={{ minWidth: 200, height: 60 }}
                >
                    USB Logs
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={() => navigate('/clipboard')}
                    sx={{ minWidth: 200, height: 60 }}
                >
                    Clipboard Logs
                </Button>
            </Box>
        </Box>
    );
}

function App() {
    return (
        <Router>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component={Link} to="/" style={{ textDecoration: 'none', color: 'white', flexGrow: 1 }}>
                        Monitoring System
                    </Typography>
                    <Button color="inherit" component={Link} to="/usb">
                        USB Logs
                    </Button>
                    <Button color="inherit" component={Link} to="/clipboard">
                        Clipboard Logs
                    </Button>
                </Toolbar>
            </AppBar>
            <Container>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/usb" element={<UsbLogs />} />
                    <Route path="/clipboard" element={<ClipboardLogs />} />
                </Routes>
            </Container>
        </Router>
    );
}

export default App;
