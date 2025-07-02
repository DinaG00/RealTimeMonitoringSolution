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
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const ApplicationLists = () => {
    const [applications, setApplications] = useState([]);
    const [nomenclature, setNomenclature] = useState([]);
    const [selectedAppId, setSelectedAppId] = useState('');
    const [currentTab, setCurrentTab] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        applicationId: '',
        fromList: '',
        toList: ''
    });

    useEffect(() => {
        fetchApplications();
        fetchNomenclature();
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

    const fetchNomenclature = async () => {
        try {
            const response = await fetch('http://localhost:5001/applications');
            if (response.ok) {
                const data = await response.json();
                setNomenclature(data);
            } else {
                throw new Error('Failed to fetch nomenclature');
            }
        } catch (error) {
            console.error('Error fetching nomenclature:', error);
            showSnackbar('Error fetching nomenclature', 'error');
        }
    };

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleAddApplication = async () => {
        if (!selectedAppId) {
            showSnackbar('Please select an application', 'error');
            return;
        }
        const list_type = currentTab === 0 ? 'whitelist' : 'blacklist';
        const oppositeListType = currentTab === 0 ? 'blacklist' : 'whitelist';
        // Check if application exists in opposite list
        const existingApp = applications.find(app => 
            app.application_id === selectedAppId && app.list_type === oppositeListType
        );
        if (existingApp) {
            setConfirmDialog({
                open: true,
                applicationId: selectedAppId,
                fromList: oppositeListType,
                toList: list_type
            });
            return;
        }
        await addApplication(selectedAppId, list_type);
    };

    const addApplication = async (application_id, list_type) => {
        try {
            const response = await fetch('http://localhost:5001/application-lists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    application_id,
                    list_type
                }),
            });
            if (response.ok) {
                setSelectedAppId('');
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
    };

    const handleConfirmMove = async () => {
        const { applicationId, fromList, toList } = confirmDialog;
        // First, find and delete the application from the source list
        const existingApp = applications.find(app => 
            app.application_id === applicationId && app.list_type === fromList
        );
        if (existingApp) {
            try {
                // Delete from source list
                const deleteResponse = await fetch(
                    `http://localhost:5001/application-lists/${existingApp.id}`,
                    { method: 'DELETE' }
                );
                if (deleteResponse.ok) {
                    // Add to target list
                    await addApplication(applicationId, toList);
                    showSnackbar(`Application moved from ${fromList} to ${toList}`, 'success');
                } else {
                    throw new Error('Failed to move application');
                }
            } catch (error) {
                console.error('Error moving application:', error);
                showSnackbar('Error moving application', 'error');
            }
        }
        setConfirmDialog({ open: false, applicationId: '', fromList: '', toList: '' });
    };

    const handleCancelMove = () => {
        setConfirmDialog({ open: false, applicationId: '', fromList: '', toList: '' });
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
                        <FormControl fullWidth>
                            <InputLabel id="application-select-label">Application</InputLabel>
                            <Select
                                labelId="application-select-label"
                                value={selectedAppId}
                                label="Application"
                                onChange={(e) => setSelectedAppId(e.target.value)}
                            >
                                {nomenclature.map((app) => (
                                    <MenuItem key={app.id} value={app.id}>
                                        {app.display_name} ({app.name})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
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
                                    primary={app.application_display_name + ' (' + app.application_name + ')'}
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
            <Dialog
                open={confirmDialog.open}
                onClose={handleCancelMove}
            >
                <DialogTitle>Move Application</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {`The application "${nomenclature.find(app => app.id === confirmDialog.applicationId)?.display_name || ''}" is currently in the ${confirmDialog.fromList}. Do you want to move it to the ${confirmDialog.toList}?`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelMove}>Cancel</Button>
                    <Button onClick={handleConfirmMove} color="primary" autoFocus>
                        Move
                    </Button>
                </DialogActions>
            </Dialog>
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