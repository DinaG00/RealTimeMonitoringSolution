import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import UsbLogs from './components/UsbLogs';
import ClipboardLogs from './components/ClipboardLogs';
import ProcessLogs from './components/ProcessLogs';

function App() {
    return (
        <Router>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Monitoring Dashboard
                    </Typography>
                    <Button color="inherit" component={Link} to="/">
                        Home
                    </Button>
                    <Button color="inherit" component={Link} to="/usb">
                        USB Logs
                    </Button>
                    <Button color="inherit" component={Link} to="/clipboard">
                        Clipboard Logs
                    </Button>
                    <Button color="inherit" component={Link} to="/process">
                        Process Logs
                    </Button>
                </Toolbar>
            </AppBar>

            <Container>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/usb" element={<UsbLogs />} />
                    <Route path="/clipboard" element={<ClipboardLogs />} />
                    <Route path="/process" element={<ProcessLogs />} />
                </Routes>
            </Container>
        </Router>
    );
}

function Home() {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Welcome to the Monitoring Dashboard
            </Typography>
            <Typography variant="body1" paragraph>
                This dashboard provides real-time monitoring of system activities including USB device connections,
                clipboard operations, and process activities.
            </Typography>
            <Typography variant="h6" gutterBottom>
                Available Monitoring Features:
            </Typography>
            <ul>
                <li>USB Device Monitoring - Track device connections and disconnections</li>
                <li>Clipboard Monitoring - Monitor clipboard content changes</li>
                <li>Process Monitoring - Track application starts and stops</li>
            </ul>
        </Container>
    );
}

export default App;
