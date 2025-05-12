import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Tabs,
    Tab,
    Alert,
    Snackbar,
    Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const ApplicationLists = () => {
    const [applications, setApplications] = useState([]);
    const [newApplication, setNewApplication] = useState('');
    const [currentTab, setCurrentTab] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const response = await fetch('http://localhost:5001/application-lists');
            if (response.ok) {
                const data = await response.json();
                setApplications(data);
            } else {
                throw new Error('Failed to fetch applications');
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
            showSnackbar('Error fetching applications', 'error');
        }
    };

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleAddApplication = async () => {
        if (!newApplication.trim()) {
            showSnackbar('Please enter an application name', 'error');
            return;
        }

        // Ensure process name is lowercase and ends with .exe
        let processName = newApplication.trim().toLowerCase();
        if (!processName.endsWith('.exe')) {
            processName += '.exe';
        }

        const list_type = currentTab === 0 ? 'whitelist' : 'blacklist';
        const oppositeListType = currentTab === 0 ? 'blacklist' : 'whitelist';
        // Prevent adding to both lists
        const existsInOppositeList = applications.some(app => app.application_name === processName && app.list_type === oppositeListType);
        if (existsInOppositeList) {
            showSnackbar(`Cannot add to ${list_type}: already present in ${oppositeListType}.`, 'error');
            return;
        }
        try {
            const response = await fetch('http://localhost:5001/application-lists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    application_name: processName,
                    list_type
                }),
            });

            if (response.ok) {
                setNewApplication('');
                fetchApplications();
                showSnackbar('Application added successfully', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add application');
            }
        } catch (error) {
            console.error('Error adding application:', error);
            showSnackbar(error.message, 'error');
        }

        // Show a warning if adding chrome.exe, msedge.exe, or firefox.exe
        if (["chrome.exe", "msedge.exe", "firefox.exe"].includes(processName)) {
            showSnackbar(
                'Warning: Browsers like Chrome, Edge, and Firefox spawn many background processes. Monitoring or blacklisting them may result in many logs and false positives.',
                'warning'
            );
        }
    };

    const handleDeleteApplication = async (id) => {
        try {
            const response = await fetch(
                `http://localhost:5001/application-lists/${id}`,
                { method: 'DELETE' }
            );

            if (response.ok) {
                fetchApplications();
                showSnackbar('Application removed successfully', 'success');
            } else {
                throw new Error('Failed to remove application');
            }
        } catch (error) {
            console.error('Error removing application:', error);
            showSnackbar('Error removing application', 'error');
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const filteredApplications = applications.filter(app => 
        app.list_type === (currentTab === 0 ? 'whitelist' : 'blacklist')
    );

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Application Lists Configuration
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Configure which applications are allowed or forbidden during exams
            </Typography>

            <Paper sx={{ mt: 2, mb: 2 }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    centered
                >
                    <Tab label="Whitelist" />
                    <Tab label="Blacklist" />
                </Tabs>

                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <TextField
                            fullWidth
                            label="Application Name"
                            value={newApplication}
                            onChange={(e) => setNewApplication(e.target.value)}
                            placeholder="Enter application name (e.g., notepad or chrome)"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddApplication()}
                            helperText={currentTab === 0 ? 
                                "Applications that students are allowed to use during exams. Enter the process name, e.g., notepad or chrome." : 
                                "Applications that students are forbidden to use during exams. Enter the process name, e.g., notepad or chrome."}
                        />
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddApplication}
                        >
                            Add
                        </Button>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <List>
                        {filteredApplications.map((app) => (
                            <ListItem key={app.id}>
                                <ListItemText
                                    primary={app.application_name}
                                    secondary={`Added on ${new Date(app.created_at).toLocaleString()}`}
                                />
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        onClick={() => handleDeleteApplication(app.id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                        {filteredApplications.length === 0 && (
                            <ListItem>
                                <ListItemText
                                    primary={`No ${currentTab === 0 ? 'whitelisted' : 'blacklisted'} applications`}
                                    secondary={`Add applications that students are ${currentTab === 0 ? 'allowed' : 'forbidden'} to use during exams`}
                                />
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Paper>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ApplicationLists; 