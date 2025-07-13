import React, { useState, useEffect, useRef } from 'react';
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

// Helper: Convert local datetime-local string to UTC ISO string
function toUTCISOString(localDateTimeString) {
    if (!localDateTimeString) return '';
    const localDate = new Date(localDateTimeString);
    return localDate.toISOString();
}

// Helper: Convert UTC string to Romanian local time string
function toRomanianLocaleString(timestamp) {
    if (!timestamp) return '';
    // If timestamp is 'YYYY-MM-DD HH:MM:SS', treat as Romanian local time
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
        // Parse as local time (Romanian)
        const [date, time] = timestamp.split(' ');
        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute, second] = time.split(':').map(Number);
        // Create a Date object in local time
        const localDate = new Date(year, month - 1, day, hour, minute, second);
        return localDate.toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
    }
    // Otherwise, treat as ISO string (UTC)
    return new Date(timestamp).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
}

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
    const [offlineConfig, setOfflineConfig] = useState(null);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [examMode, setExamMode] = useState(false);
    const [examPeriod, setExamPeriod] = useState({ start: '', end: '' });
    const [notifications, setNotifications] = useState([]);
    const [showNotification, setShowNotification] = useState(false);
    const [latestNotification, setLatestNotification] = useState(null);
    const wsRef = useRef(null);
    const [highlightedPCs, setHighlightedPCs] = useState([]);
    const [notificationTab, setNotificationTab] = useState(0);
    const [editPcDialog, setEditPcDialog] = useState({ open: false, pc: null, newName: '' });

    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchClassrooms(), fetchPCs(), fetchOfflineConfig()]);
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

    const fetchOfflineConfig = async () => {
        try {
            const response = await fetch('http://localhost:5001/config/offline-detection');
            if (response.ok) {
                const data = await response.json();
                setOfflineConfig(data);
            }
        } catch (error) {
            console.error('Error fetching offline config:', error);
        }
    };

    const getFilterPeriod = () => {
        if (examMode && examPeriod.start && examPeriod.end) {
            return { start: toUTCISOString(examPeriod.start), end: toUTCISOString(examPeriod.end) };
        }
        if (startTime && endTime) {
            return { start: toUTCISOString(startTime), end: toUTCISOString(endTime) };
        }
        return { start: '', end: '' };
    };

    const fetchClassroomStats = async (classroomId) => {
        setLoadingStats(true);
        try {
            const { start, end } = getFilterPeriod();
            let url = `http://localhost:5001/classrooms/${classroomId}/stats`;
            if (start && end) {
                url += `?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}`;
            }
            const response = await fetch(url);
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
            await fetchClassroomStats(classroom.id);
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

    const handleEditPcDialog = (pc) => {
        setEditPcDialog({ open: true, pc, newName: pc.pc_name });
    };

    const handleEditPcClose = () => {
        setEditPcDialog({ open: false, pc: null, newName: '' });
    };

    const handleEditPcSubmit = async () => {
        if (!editPcDialog.pc || !editPcDialog.newName.trim()) {
            showSnackbar('Enter a PC name', 'error');
            return;
        }

        // Check if the new name is the same as the current name
        if (editPcDialog.newName.trim() === editPcDialog.pc.pc_name) {
            handleEditPcClose();
            return;
        }

        try {
            const response = await fetch(`http://localhost:5001/pcs/${editPcDialog.pc.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    pc_name: editPcDialog.newName.trim(),
                    classroom_id: editPcDialog.pc.classroom_id
                })
            });

            if (response.ok) {
                await fetchPCs();
                if (selectedClassroom) {
                    // Refresh classroom PCs if a classroom is selected
                    const classroomResponse = await fetch(`http://localhost:5001/classrooms/${selectedClassroom.id}/pcs`);
                    if (classroomResponse.ok) {
                        const data = await classroomResponse.json();
                        setClassroomPCs(data);
                    }
                }
                showSnackbar('PC renamed successfully', 'success');
                handleEditPcClose();
            } else {
                const errorData = await response.json();
                if (response.status === 400 && errorData.error && errorData.error.includes('UNIQUE constraint failed')) {
                    showSnackbar('A PC with this name already exists', 'error');
                } else {
                    throw new Error(errorData.error || 'Failed to rename PC');
                }
            }
        } catch (error) {
            console.error('Error renaming PC:', error);
            showSnackbar(error.message || 'Failed to rename PC', 'error');
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

    const renderPCStatus = (pc) => {
        const getTimeSinceLastConnection = (lastConnection) => {
            if (!lastConnection) return 'Never connected';
            
            const lastSeen = new Date(lastConnection);
            const now = new Date();
            const diffMs = now - lastSeen;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) return `${diffDays}d ago`;
            if (diffHours > 0) return `${diffHours}h ago`;
            if (diffMinutes > 0) return `${diffMinutes}m ago`;
            return 'Just now';
        };

        return (
            <Box>
                <Box sx={{ 
                    display: 'inline-block',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: pc.is_connected ? 'success.light' : 'error.light',
                    color: 'white',
                    fontWeight: 'bold',
                    mb: 0.5
                }}>
                    {pc.is_connected ? 'Online' : 'Offline'}
                </Box>
                {!pc.is_connected && pc.last_connection && (
                    <Typography variant="caption" color="text.secondary" display="block">
                        Last seen: {getTimeSinceLastConnection(pc.last_connection)}
                    </Typography>
                )}
            </Box>
        );
    };

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
            let processUrl = `http://localhost:5001/pcs/${pc.id}/process-logs`;
            let usbUrl = `http://localhost:5001/pcs/${pc.id}/usb-logs`;
            let clipboardUrl = `http://localhost:5001/pcs/${pc.id}/clipboard-logs`;
            let downloadUrl = `http://localhost:5001/pcs/${pc.id}/download-logs`;
            if (examMode && examPeriod.start && examPeriod.end) {
                const params = `?start_time=${encodeURIComponent(examPeriod.start)}&end_time=${encodeURIComponent(examPeriod.end)}`;
                processUrl += params;
                usbUrl += params;
                clipboardUrl += params;
                downloadUrl += params;
            }
            const [processRes, usbRes, clipboardRes, downloadRes] = await Promise.all([
                fetch(processUrl),
                fetch(usbUrl),
                fetch(clipboardUrl),
                fetch(downloadUrl)
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
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {pcs.map((pc) => (
                        <TableRow
                            key={pc.id}
                            hover
                            style={{
                                backgroundColor: highlightedPCs.includes(pc.id) ? '#fff9c4' : undefined // yellow highlight
                            }}
                        >
                            <TableCell 
                                style={{ cursor: 'pointer' }}
                                onClick={() => handlePcRowClick(pc)}
                            >
                                {pc.pc_name}
                            </TableCell>
                            <TableCell 
                                style={{ cursor: 'pointer' }}
                                onClick={() => handlePcRowClick(pc)}
                            >
                                {notifications.some(n => n.pcId === pc.id) && (
                                    <WarningIcon color="error" sx={{ mr: 1 }} />
                                )}
                                {renderPCStatus(pc)}
                            </TableCell>
                            <TableCell 
                                style={{ cursor: 'pointer' }}
                                onClick={() => handlePcRowClick(pc)}
                            >
                                {renderClassroomSelect(pc)}
                            </TableCell>
                            <TableCell 
                                style={{ cursor: 'pointer' }}
                                onClick={() => handlePcRowClick(pc)}
                            >
                                {pc.last_connection 
                                    ? toRomanianLocaleString(pc.last_connection)
                                    : 'Never'}
                            </TableCell>
                            <TableCell>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<EditIcon />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPcDialog(pc);
                                    }}
                                >
                                    Edit
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    useEffect(() => {
        if (selectedClassroom) {
            fetchClassroomStats(selectedClassroom.id);
        }
        // eslint-disable-next-line
    }, [startTime, endTime, examMode, examPeriod]);

    // Periodic refresh of PC status (every 30 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchPCs();
            if (selectedClassroom) {
                fetchClassroomStats(selectedClassroom.id);
            }
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [selectedClassroom]);

    const closeNotification = (notif) => {
        setShowNotification(false);
        setHighlightedPCs(prev => prev.filter(id => id !== notif.pcId));
    };

    const deleteNotification = (notif) => {
        setNotifications(prev => prev.filter(n => n.logId !== notif.logId));
        setHighlightedPCs(prev => prev.filter(id => id !== notif.pcId));
    };

    const fetchHistoricalNotifications = async (classroomId, startTime, endTime) => {
        try {
            const response = await fetch(`http://localhost:5001/classrooms/${classroomId}/notifications?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
                // Highlight PCs that have notifications
                const pcIdsWithNotifications = [...new Set(data.map(n => n.pcId))];
                setHighlightedPCs(pcIdsWithNotifications);
            }
        } catch (error) {
            console.error('Error fetching historical notifications:', error);
        }
    };

    useEffect(() => {
        // Connect to WebSocket server (always connect, not just in exam mode)
        const ws = new window.WebSocket('ws://localhost:5001');
        wsRef.current = ws;
        ws.onmessage = (event) => {
            const notif = JSON.parse(event.data);
            
            // Handle PC status changes (online/offline)
            if (notif.type === 'pc_status_change') {
                // Refresh PC list to show updated status
                fetchPCs();
                // Also refresh classroom stats if a classroom is selected
                if (selectedClassroom) {
                    fetchClassroomStats(selectedClassroom.id);
                }
                return;
            }
            
            // Handle exam mode notifications
            if (!examMode || !selectedClassroom) return;
            
            const supportedTypes = ['process_log', 'usb_log', 'clipboard_log', 'download_log'];
            if (
                supportedTypes.includes(notif.type) &&
                classroomPCs.some(pc => pc.id === notif.pcId) &&
                notif.timestamp >= examPeriod.start && notif.timestamp <= examPeriod.end &&
                !notifications.some(n => n.logId === notif.logId)
            ) {
                setNotifications(prev => [...prev, notif]);
                setLatestNotification(notif);
                setShowNotification(true);
                setHighlightedPCs(prev => Array.from(new Set([...prev, notif.pcId])));
                if (pcLogsDialog.open && pcLogsDialog.pc && pcLogsDialog.pc.id === notif.pcId) {
                    handlePcRowClick(pcLogsDialog.pc);
                }
            }
        };
        ws.onclose = () => { wsRef.current = null; };
        return () => { ws.close(); };
        // eslint-disable-next-line
    }, [examMode, examPeriod, selectedClassroom, classroomPCs, notifications, pcLogsDialog]);

    const renderNotificationHistory = () => (
        <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Notification History</Typography>
                {notifications.length > 0 && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                            setNotifications([]);
                            setHighlightedPCs([]);
                        }}
                    >
                        Clear All
                    </Button>
                )}
            </Box>
            {notifications.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No notifications yet.</Typography>
            ) : (
                <List>
                    {notifications.map((notif, idx) => (
                        <ListItem key={notif.logId || idx} alignItems="flex-start" sx={{ bgcolor: highlightedPCs.includes(notif.pcId) ? '#fff9c4' : undefined }}>
                            <ListItemText
                                primary={`[${notif.type.replace('_log', '').toUpperCase()}] ${notif.pcName} (${notif.pcId})`}
                                secondary={
                                    <>
                                        <span>{notif.timestamp ? toRomanianLocaleString(notif.timestamp) : ''}</span><br/>
                                        {notif.appName && <span>App: {notif.appName}<br/></span>}
                                        {notif.deviceName && <span>Device: {notif.deviceName}<br/></span>}
                                        {notif.action && <span>Action: {notif.action}<br/></span>}
                                        {notif.content && <span>Clipboard: {notif.content}<br/></span>}
                                        {notif.fileName && <span>File: {notif.fileName}<br/></span>}
                                        {notif.fileType && <span>Type: {notif.fileType}<br/></span>}
                                    </>
                                }
                            />
                            <ListItemSecondaryAction>
                                <Button size="small" color="error" onClick={() => deleteNotification(notif)} sx={{ mr: 1 }}>
                                    Delete
                                </Button>
                                <Button size="small" color="primary" onClick={() => closeNotification(notif)}>
                                    Dismiss
                                </Button>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
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
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <label>Start Time:</label>
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        disabled={examMode}
                    />
                    <label>End Time:</label>
                    <input
                        type="datetime-local"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        disabled={examMode}
                    />
                    <Button
                        variant="contained"
                        color="success"
                        onClick={async () => {
                            if (startTime && endTime) {
                                const startUTC = toUTCISOString(startTime);
                                const endUTC = toUTCISOString(endTime);
                                setExamPeriod({ start: startUTC, end: endUTC });
                                setExamMode(true);
                                
                                // Fetch historical notifications for the exam period
                                if (selectedClassroom) {
                                    await fetchHistoricalNotifications(selectedClassroom.id, startUTC, endUTC);
                                }
                            }
                        }}
                        disabled={examMode || !startTime || !endTime}
                    >
                        Start Exam
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            setStartTime('');
                            setEndTime('');
                            setExamMode(false);
                            setExamPeriod({ start: '', end: '' });
                            setNotifications([]);
                            setHighlightedPCs([]);
                        }}
                        sx={{ ml: 2 }}
                    >
                        Clear
                    </Button>
                </Box>
            )}
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
                            onClick={async () => {
                                setShowStats((prev) => !prev);
                                if (!showStats && selectedClassroom) {
                                    await fetchClassroomStats(selectedClassroom.id);
                                }
                            }}
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
                                    <CardHeader avatar={<WarningIcon color="error" />} title="Blacklisted Apps Launched" />
                                    <CardContent>
                                        {classroomStats.blacklistedAppsLaunched && classroomStats.blacklistedAppsLaunched.length > 0 ? (
                                            <Typography variant="body1">
                                                {classroomStats.blacklistedAppsLaunched.map(app => app.display_name).join(', ')}
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">No blacklisted app launches</Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardHeader avatar={<AccessTimeIcon color="primary" />} title="Most Recent Activity" />
                                    <CardContent>
                                        <Typography variant="h6">
                                            {classroomStats.recentActivity ? toRomanianLocaleString(classroomStats.recentActivity) : 'N/A'}
                                        </Typography>
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
            <Tabs value={notificationTab} onChange={(_, v) => setNotificationTab(v)} sx={{ mb: 2 }}>
                <Tab label="PCs" />
                <Tab label={`Notification History ${notifications.length > 0 ? `(${notifications.length})` : ''}`} />
            </Tabs>
            {notificationTab === 0 ? (
                <>
                    <Typography variant="h6" gutterBottom>
                        Unassigned PCs
                    </Typography>
                    {renderPCList(getUnassignedPCs())}
                </>
            ) : (
                renderNotificationHistory()
            )}
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
            {/* Edit PC Dialog */}
            <Dialog open={editPcDialog.open} onClose={handleEditPcClose}>
                <DialogTitle>Edit PC Name</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="PC Name"
                        fullWidth
                        value={editPcDialog.newName}
                        onChange={(e) => setEditPcDialog(prev => ({ ...prev, newName: e.target.value }))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditPcClose}>Cancel</Button>
                    <Button onClick={handleEditPcSubmit} variant="contained">Save</Button>
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
                                                    <TableCell>{log.timestamp ? toRomanianLocaleString(log.timestamp) : ''}</TableCell>
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
                                                    <TableCell>{log.timestamp ? toRomanianLocaleString(log.timestamp) : ''}</TableCell>
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
                                                    <TableCell>{log.timestamp ? toRomanianLocaleString(log.timestamp) : ''}</TableCell>
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
                                                    <TableCell>{log.timestamp ? toRomanianLocaleString(log.timestamp) : ''}</TableCell>
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
            {showNotification && latestNotification && (
                <Snackbar
                    open={showNotification}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    onClose={() => closeNotification(latestNotification)}
                    autoHideDuration={null}
                    message={
                        <span>
                            <b>New {latestNotification.type.replace('_log', '').toUpperCase()} log</b> for <b>{latestNotification.pcName}</b>
                            {latestNotification.appName && <>: {latestNotification.appName}</>}
                            {latestNotification.deviceName && <>: {latestNotification.deviceName}</>}
                            {latestNotification.action && <> ({latestNotification.action})</>}
                            {latestNotification.content && <>: {latestNotification.content}</>}
                            {latestNotification.fileName && <>: {latestNotification.fileName}</>}
                        </span>
                    }
                    action={
                        <Button color="inherit" size="small" onClick={() => closeNotification(latestNotification)}>
                            Close
                        </Button>
                    }
                />
            )}
            {examMode && examPeriod.start && examPeriod.end && (
                <Box sx={{ mb: 2 }}>
                    <Alert severity="info">
                        Exam period: {toRomanianLocaleString(examPeriod.start)} - {toRomanianLocaleString(examPeriod.end)}
                    </Alert>
                </Box>
            )}
        </Box>
    );
};

export default PCManagement; 