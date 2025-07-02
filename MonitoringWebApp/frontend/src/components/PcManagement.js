import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Alert,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Card,
    CardContent,
    Divider,
    CircularProgress,
    Grid,
    CardHeader,
    Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ComputerIcon from '@mui/icons-material/Computer';
import SchoolIcon from '@mui/icons-material/School';
import Autocomplete from '@mui/material/Autocomplete';
import BarChartIcon from '@mui/icons-material/BarChart';
import UsbIcon from '@mui/icons-material/Usb';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DownloadIcon from '@mui/icons-material/Download';
import AppsIcon from '@mui/icons-material/Apps';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const PCManagement = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [classrooms, setClassrooms] = useState([]);
    const [pcs, setPCs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState({
        open: false,
        type: '', // 'classroom' or 'pc'
        mode: '', // 'add' or 'edit'
        data: null
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [newClassroom, setNewClassroom] = useState('');
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [classroomPCs, setClassroomPCs] = useState([]);
    const [loadingClassroomPCs, setLoadingClassroomPCs] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editClassroomName, setEditClassroomName] = useState('');
    const [classroomStats, setClassroomStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [pcLogsDialog, setPcLogsDialog] = useState({ open: false, pc: null });
    const [pcLogs, setPcLogs] = useState({ process: [], usb: [], clipboard: [], download: [] });
    const [logsTab, setLogsTab] = useState(0);
    const [loadingPcLogs, setLoadingPcLogs] = useState(false);

    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchClassrooms(), fetchPCs()]);
            } catch (error) {
                console.error('Error initializing data:', error);
                showSnackbar('Error loading data', 'error');
            } finally {
                setLoading(false);
            }
        };

        initializeData();
        // Update PC status every 30 seconds
        const interval = setInterval(() => {
            fetchPCs();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchClassrooms = async () => {
        try {
            const response = await fetch('http://localhost:5001/classrooms');
            if (response.ok) {
                const data = await response.json();
                setClassrooms(data);
            } else {
                throw new Error('Failed to fetch classrooms');
            }
        } catch (error) {
            console.error('Error fetching classrooms:', error);
            showSnackbar('Error fetching classrooms', 'error');
        }
    };

    const fetchPCs = async () => {
        try {
            const response = await fetch('http://localhost:5001/pcs');
            if (response.ok) {
                const data = await response.json();
                setPCs(data);
            } else {
                throw new Error('Failed to fetch PCs');
            }
        } catch (error) {
            console.error('Error fetching PCs:', error);
            showSnackbar('Error fetching PCs', 'error');
        }
    };

    const fetchClassroomStats = async (classroomId) => {
        setLoadingStats(true);
        try {
            const response = await fetch(`http://localhost:5001/classrooms/${classroomId}/stats`);
            if (response.ok) {
                const data = await response.json();
                setClassroomStats(data);
            } else {
                setClassroomStats(null);
            }
        } catch (error) {
            setClassroomStats(null);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleClassroomSelect = async (event, classroom) => {
        setSelectedClassroom(classroom);
        if (classroom) {
            setLoadingClassroomPCs(true);
            fetchClassroomStats(classroom.id);
            try {
                const response = await fetch(`http://localhost:5001/classrooms/${classroom.id}/pcs`);
                if (response.ok) {
                    const data = await response.json();
                    setClassroomPCs(data);
                } else {
                    setClassroomPCs([]);
                }
            } catch (error) {
                setClassroomPCs([]);
            } finally {
                setLoadingClassroomPCs(false);
            }
        } else {
            setClassroomPCs([]);
            setClassroomStats(null);
        }
    };

    const handleAddClassroomDialog = () => {
        setAddDialogOpen(true);
    };

    const handleAddClassroomClose = () => {
        setAddDialogOpen(false);
        setNewClassroom('');
    };

    const handleAddClassroomSubmit = async () => {
        if (!newClassroom.trim()) {
            showSnackbar('Enter a classroom name', 'error');
            return;
        }
        try {
            const response = await fetch('http://localhost:5001/classrooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newClassroom.trim() })
            });
            if (response.ok) {
                setNewClassroom('');
                await fetchClassrooms();
                showSnackbar('Classroom added successfully', 'success');
                setAddDialogOpen(false);
            } else {
                throw new Error('Failed to add classroom');
            }
        } catch (error) {
            console.error('Error adding classroom:', error);
            showSnackbar('Failed to add classroom', 'error');
        }
    };

    const handleEditClassroomDialog = () => {
        if (!selectedClassroom) return;
        setEditClassroomName(selectedClassroom.name);
        setEditDialogOpen(true);
    };

    const handleEditClassroomClose = () => {
        setEditDialogOpen(false);
        setEditClassroomName('');
    };

    const handleEditClassroomSubmit = async () => {
        if (!editClassroomName.trim() || !selectedClassroom) {
            showSnackbar('Enter a classroom name', 'error');
            return;
        }
        try {
            const response = await fetch(`http://localhost:5001/classrooms/${selectedClassroom.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editClassroomName.trim() })
            });
            if (response.ok) {
                await fetchClassrooms();
                showSnackbar('Classroom updated successfully', 'success');
                setEditDialogOpen(false);
                setSelectedClassroom({ ...selectedClassroom, name: editClassroomName.trim() });
            } else {
                throw new Error('Failed to update classroom');
            }
        } catch (error) {
            console.error('Error updating classroom:', error);
            showSnackbar('Failed to update classroom', 'error');
        }
    };

    const handleDeleteClassroom = async () => {
        if (!selectedClassroom) return;
        try {
            const response = await fetch(`http://localhost:5001/classrooms/${selectedClassroom.id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await fetchClassrooms();
                showSnackbar('Classroom deleted successfully', 'success');
                setSelectedClassroom(null);
                setClassroomPCs([]);
            } else {
                throw new Error('Failed to delete classroom');
            }
        } catch (error) {
            console.error('Error deleting classroom:', error);
            showSnackbar('Error deleting classroom', 'error');
        }
    };

    const handleAssignClassroom = async (pcId, classroomId) => {
        try {
            const pc = pcs.find(pc => pc.id === pcId);
            if (!pc) {
                throw new Error('PC not found');
            }

            const response = await fetch(`http://localhost:5001/pcs/${pcId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    pc_name: pc.pc_name,
                    classroom_id: classroomId || null
                })
            });

            if (!response.ok) {
                throw new Error('Failed to assign classroom');
            }

            await fetchPCs();
            showSnackbar(
                classroomId 
                    ? 'PC assigned to classroom successfully' 
                    : 'PC unassigned from classroom successfully', 
                'success'
            );
        } catch (error) {
            console.error('Error assigning classroom:', error);
            showSnackbar(error.message || 'Failed to assign classroom', 'error');
        }
    };

    const handleDialogClose = () => {
        setDialog({ open: false, type: '', mode: '', data: null });
    };

    const handleDialogSubmit = async () => {
        try {
            if (dialog.type === 'classroom') {
                const url = dialog.mode === 'add' 
                    ? 'http://localhost:5001/classrooms'
                    : `http://localhost:5001/classrooms/${dialog.data.id}`;
                
                const response = await fetch(url, {
                    method: dialog.mode === 'add' ? 'POST' : 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: dialog.data.name }),
                });

                if (response.ok) {
                    fetchClassrooms();
                    showSnackbar(`Classroom ${dialog.mode === 'add' ? 'added' : 'updated'} successfully`, 'success');
                } else {
                    throw new Error(`Failed to ${dialog.mode} classroom`);
                }
            }
            handleDialogClose();
        } catch (error) {
            console.error(`Error ${dialog.mode}ing ${dialog.type}:`, error);
            showSnackbar(`Error ${dialog.mode}ing ${dialog.type}`, 'error');
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const getClassroomPCs = (classroomId) => {
        return pcs.filter(pc => pc.classroom_id === classroomId);
    };

    const getUnassignedPCs = () => {
        return pcs.filter(pc => !pc.classroom_id);
    };

    const renderPCStatus = (pc) => (
        <Box sx={{ 
            display: 'inline-block',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: pc.is_connected ? 'success.light' : 'error.light',
            color: 'white',
            fontWeight: 'bold'
        }}>
            {pc.is_connected ? 'Online' : 'Offline'}
        </Box>
    );

    const renderClassroomSelect = (pc) => (
        <FormControl fullWidth size="small">
            <InputLabel>Classroom</InputLabel>
            <Select
                value={pc.classroom_id || ''}
                label="Classroom"
                onChange={(e) => handleAssignClassroom(pc.id, e.target.value)}
            >
                <MenuItem value="">
                    <em>Unassigned</em>
                </MenuItem>
                {classrooms.map((classroom) => (
                    <MenuItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );

    const handlePcRowClick = async (pc) => {
        setPcLogsDialog({ open: true, pc });
        setLoadingPcLogs(true);
        try {
            const [processRes, usbRes, clipboardRes, downloadRes] = await Promise.all([
                fetch(`http://localhost:5001/pcs/${pc.id}/process-logs`),
                fetch(`http://localhost:5001/pcs/${pc.id}/usb-logs`),
                fetch(`http://localhost:5001/pcs/${pc.id}/clipboard-logs`),
                fetch(`http://localhost:5001/pcs/${pc.id}/download-logs`)
            ]);
            const [process, usb, clipboard, download] = await Promise.all([
                processRes.ok ? processRes.json() : [],
                usbRes.ok ? usbRes.json() : [],
                clipboardRes.ok ? clipboardRes.json() : [],
                downloadRes.ok ? downloadRes.json() : []
            ]);
            setPcLogs({ process, usb, clipboard, download });
        } catch (error) {
            setPcLogs({ process: [], usb: [], clipboard: [], download: [] });
        } finally {
            setLoadingPcLogs(false);
        }
    };

    const handlePcLogsDialogClose = () => {
        setPcLogsDialog({ open: false, pc: null });
        setPcLogs({ process: [], usb: [], clipboard: [], download: [] });
        setLogsTab(0);
    };

    const handleLogsTabChange = (event, newValue) => {
        setLogsTab(newValue);
    };

    const renderPCList = (pcs) => (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>PC Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Classroom</TableCell>
                        <TableCell>Last Connection</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {pcs.map((pc) => (
                        <TableRow key={pc.id} hover style={{ cursor: 'pointer' }} onClick={() => handlePcRowClick(pc)}>
                            <TableCell>{pc.pc_name}</TableCell>
                            <TableCell>{renderPCStatus(pc)}</TableCell>
                            <TableCell>{renderClassroomSelect(pc)}</TableCell>
                            <TableCell>
                                {pc.last_connection 
                                    ? new Date(pc.last_connection).toLocaleString()
                                    : 'Never'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                PC Management
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Manage classrooms and PCs
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClassroomDialog}>
                    Add Classroom
                </Button>
                <Autocomplete
                    options={classrooms}
                    getOptionLabel={(option) => option.name}
                    value={selectedClassroom}
                    onChange={handleClassroomSelect}
                    renderInput={(params) => <TextField {...params} label="Select Classroom" variant="outlined" />}
                    sx={{ minWidth: 250 }}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                />
                {selectedClassroom && (
                    <>
                        <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEditClassroomDialog}>
                            Edit
                        </Button>
                        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteClassroom}>
                            Delete
                        </Button>
                    </>
                )}
            </Box>
            {selectedClassroom && (
                <Box sx={{ my: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" gutterBottom sx={{ flexGrow: 1 }}>
                            PCs in {selectedClassroom.name}
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={showStats ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            onClick={() => setShowStats((prev) => !prev)}
                            sx={{ ml: 2 }}
                        >
                            {showStats ? 'Hide Statistics' : 'Show Statistics'}
                        </Button>
                    </Box>
                    {showStats && (loadingStats ? (
                        <CircularProgress />
                    ) : classroomStats && (
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardHeader avatar={<ComputerIcon color="primary" />} title="Total PCs" />
                                    <CardContent>
                                        <Typography variant="h5">{classroomStats.numPCs}</Typography>
                                        <Typography variant="body2" color="text.secondary">Online: {classroomStats.numOnline} / Offline: {classroomStats.numOffline}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardHeader avatar={<BarChartIcon color="primary" />} title="Process Logs" />
                                    <CardContent>
                                        <Typography variant="h5">{classroomStats.numProcessLogs}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardHeader avatar={<UsbIcon color="primary" />} title="USB Logs" />
                                    <CardContent>
                                        <Typography variant="h5">{classroomStats.numUSBLogs}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardHeader avatar={<ContentPasteIcon color="primary" />} title="Clipboard Logs" />
                                    <CardContent>
                                        <Typography variant="h5">{classroomStats.numClipboardLogs}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardHeader avatar={<DownloadIcon color="primary" />} title="Download Logs" />
                                    <CardContent>
                                        <Typography variant="h5">{classroomStats.numDownloadLogs}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardHeader avatar={<WarningIcon color="error" />} title="Blacklisted App Launches" />
                                    <CardContent>
                                        <Typography variant="h5">{classroomStats.numBlacklistedAppLaunches}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardHeader avatar={<AccessTimeIcon color="primary" />} title="Most Recent Activity" />
                                    <CardContent>
                                        <Typography variant="h6">
                                            {classroomStats.recentActivity ? new Date(classroomStats.recentActivity).toLocaleString() : 'N/A'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardHeader avatar={<AppsIcon color="primary" />} title="Top Applications" />
                                    <CardContent>
                                        {classroomStats.mostCommonApps && classroomStats.mostCommonApps.length > 0 ? (
                                            <List dense>
                                                {classroomStats.mostCommonApps.map((app, idx) => (
                                                    <ListItem key={app.name}>
                                                        <ListItemText
                                                            primary={`${idx + 1}. ${app.display_name} (${app.name})`}
                                                            secondary={`Launched ${app.count} times`}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">No data</Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    ))}
                    {loadingClassroomPCs ? (
                        <CircularProgress />
                    ) : (
                        renderPCList(classroomPCs)
                    )}
                </Box>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
                Unassigned PCs
            </Typography>
            {renderPCList(getUnassignedPCs())}
            {/* Add Classroom Dialog */}
            <Dialog open={addDialogOpen} onClose={handleAddClassroomClose}>
                <DialogTitle>Add Classroom</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Classroom Name"
                        fullWidth
                        value={newClassroom}
                        onChange={(e) => setNewClassroom(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAddClassroomClose}>Cancel</Button>
                    <Button onClick={handleAddClassroomSubmit} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>
            {/* Edit Classroom Dialog */}
            <Dialog open={editDialogOpen} onClose={handleEditClassroomClose}>
                <DialogTitle>Edit Classroom</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Classroom Name"
                        fullWidth
                        value={editClassroomName}
                        onChange={(e) => setEditClassroomName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditClassroomClose}>Cancel</Button>
                    <Button onClick={handleEditClassroomSubmit} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
            {/* PC Logs Dialog */}
            <Dialog open={pcLogsDialog.open} onClose={handlePcLogsDialogClose} maxWidth="lg" fullWidth>
                <DialogTitle>Logs for {pcLogsDialog.pc?.pc_name}</DialogTitle>
                <DialogContent dividers>
                    {loadingPcLogs ? (
                        <CircularProgress />
                    ) : (
                        <>
                            <Tabs value={logsTab} onChange={handleLogsTabChange} sx={{ mb: 2 }}>
                                <Tab label="Process Logs" />
                                <Tab label="USB Logs" />
                                <Tab label="Clipboard Logs" />
                                <Tab label="Download Logs" />
                            </Tabs>
                            {logsTab === 0 && (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Time</TableCell>
                                                <TableCell>Application</TableCell>
                                                <TableCell>Action</TableCell>
                                                <TableCell>Window Title</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pcLogs.process.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</TableCell>
                                                    <TableCell>{log.application_display_name} ({log.application_name})</TableCell>
                                                    <TableCell>{log.action}</TableCell>
                                                    <TableCell>{log.window_title}</TableCell>
                                                </TableRow>
                                            ))}
                                            {pcLogs.process.length === 0 && (
                                                <TableRow><TableCell colSpan={4}>No process logs</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            {logsTab === 1 && (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Time</TableCell>
                                                <TableCell>Device Name</TableCell>
                                                <TableCell>Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pcLogs.usb.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</TableCell>
                                                    <TableCell>{log.device_name}</TableCell>
                                                    <TableCell>{log.action}</TableCell>
                                                </TableRow>
                                            ))}
                                            {pcLogs.usb.length === 0 && (
                                                <TableRow><TableCell colSpan={3}>No USB logs</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            {logsTab === 2 && (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Time</TableCell>
                                                <TableCell>Content</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pcLogs.clipboard.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</TableCell>
                                                    <TableCell>{log.content}</TableCell>
                                                </TableRow>
                                            ))}
                                            {pcLogs.clipboard.length === 0 && (
                                                <TableRow><TableCell colSpan={2}>No clipboard logs</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            {logsTab === 3 && (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Time</TableCell>
                                                <TableCell>File Name</TableCell>
                                                <TableCell>File Type</TableCell>
                                                <TableCell>Content</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pcLogs.download.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</TableCell>
                                                    <TableCell>{log.file_name}</TableCell>
                                                    <TableCell>{log.file_type}</TableCell>
                                                    <TableCell>{log.content}</TableCell>
                                                </TableRow>
                                            ))}
                                            {pcLogs.download.length === 0 && (
                                                <TableRow><TableCell colSpan={4}>No download logs</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handlePcLogsDialogClose}>Close</Button>
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

export default PCManagement; 