import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import theme from './theme';
import ProcessLogs from './components/ProcessLogs';
import UsbLogs from './components/UsbLogs';
import ClipboardLogs from './components/ClipboardLogs';
import DownloadLogs from './components/DownloadLogs';

const Home = () => (
    <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 600 }}>
            Welcome to the Monitoring Dashboard
        </Typography>
        <Typography variant="body1" paragraph>
            This dashboard provides real-time monitoring of system activities including USB device connections,
            clipboard operations, process activities, and file downloads.
        </Typography>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Available Monitoring Features:
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" sx={{ mb: 1 }}>
                USB Device Monitoring - Track device connections and disconnections
            </Typography>
            <Typography component="li" sx={{ mb: 1 }}>
                Clipboard Monitoring - Monitor clipboard content changes
            </Typography>
            <Typography component="li" sx={{ mb: 1 }}>
                Process Monitoring - Track application starts and stops
            </Typography>
            <Typography component="li" sx={{ mb: 1 }}>
                Download Monitoring - Track file downloads and their content
            </Typography>
        </Box>
    </Box>
);

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <AppBar position="static" elevation={0}>
                        <Toolbar sx={{ justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <img 
                                    src="/Logo_ASE.png" 
                                    alt="ASE Logo" 
                                    style={{ 
                                        height: 60,
                                        width: 'auto',
                                        marginLeft: '8px'
                                    }} 
                                />
                                <Typography
                                    variant="h6"
                                    component={Link}
                                    to="/"
                                    sx={{
                                        fontWeight: 600,
                                        color: theme.palette.primary.main,
                                        textDecoration: 'none',
                                        '&:hover': {
                                            color: theme.palette.primary.dark,
                                        },
                                    }}
                                >
                                    Real-Time Monitoring System
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    component={Link}
                                    to="/process"
                                    sx={{
                                        color: theme.palette.primary.main,
                                        fontWeight: 500,
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 120, 212, 0.04)',
                                        },
                                    }}
                                >
                                    Process Logs
                                </Button>
                                <Button
                                    component={Link}
                                    to="/usb"
                                    sx={{
                                        color: theme.palette.primary.main,
                                        fontWeight: 500,
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 120, 212, 0.04)',
                                        },
                                    }}
                                >
                                    USB Logs
                                </Button>
                                <Button
                                    component={Link}
                                    to="/clipboard"
                                    sx={{
                                        color: theme.palette.primary.main,
                                        fontWeight: 500,
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 120, 212, 0.04)',
                                        },
                                    }}
                                >
                                    Clipboard Logs
                                </Button>
                                <Button
                                    component={Link}
                                    to="/downloads"
                                    sx={{
                                        color: theme.palette.primary.main,
                                        fontWeight: 500,
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 120, 212, 0.04)',
                                        },
                                    }}
                                >
                                    Download Logs
                                </Button>
                            </Box>
                        </Toolbar>
                    </AppBar>

                    <Container 
                        maxWidth="lg" 
                        sx={{ 
                            mt: 4, 
                            mb: 4, 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/process" element={<ProcessLogs />} />
                            <Route path="/usb" element={<UsbLogs />} />
                            <Route path="/clipboard" element={<ClipboardLogs />} />
                            <Route path="/downloads" element={<DownloadLogs />} />
                        </Routes>
                    </Container>

                    <Box
                        component="footer"
                        sx={{
                            py: 3,
                            px: 2,
                            mt: 'auto',
                            backgroundColor: (theme) =>
                                theme.palette.mode === 'light'
                                    ? theme.palette.grey[100]
                                    : theme.palette.grey[900],
                        }}
                    >
                        <Container maxWidth="lg">
                            <Typography variant="body2" color="text.secondary" align="center">
                                © {new Date().getFullYear()} Real-Time Monitoring System
                            </Typography>
                        </Container>
                    </Box>
                </Box>
            </Router>
        </ThemeProvider>
    );
}

export default App;
