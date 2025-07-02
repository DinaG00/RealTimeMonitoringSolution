import React, { useState, useEffect } from 'react';
import { 
    Table, 
    Container, 
    Typography, 
    Paper, 
    TableHead, 
    TableBody, 
    TableRow, 
    TableCell,
    Box,
    Card,
    CardContent,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';

const ProcessLogs = () => {
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('http://localhost:5001/logs/process');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setLogs(Array.isArray(data) ? data : []);
                setError(null);
            } catch (error) {
                console.error('Error fetching process logs:', error);
                setError('Failed to fetch process logs');
                setLogs([]);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await fetch('http://localhost:5001/logs/process', {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            setLogs([]);
            setError(null);
        } catch (error) {
            console.error('Error clearing process logs:', error);
            setError('Failed to clear process logs');
        }
        setDeleteDialogOpen(false);
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return format(date, 'yyyy-MM-dd HH:mm:ss');
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                    }}
                >
                    Process Logs
                </Typography>
                <Tooltip title="Clear all process logs">
                    <IconButton 
                        onClick={handleDeleteClick}
                        color="error"
                        sx={{ 
                            '&:hover': {
                                backgroundColor: 'error.lighter'
                            }
                        }}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
            >
                <DialogTitle>Clear Process Logs</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to clear all process logs? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Clear Logs
                    </Button>
                </DialogActions>
            </Dialog>

            <Card 
                sx={{ 
                    width: '100%', 
                    overflow: 'hidden',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                }}
            >
                <CardContent sx={{ p: 0 }}>
                    {error && (
                        <Box sx={{ p: 2, color: 'error.main' }}>
                            <Typography variant="body2">
                                {error}
                            </Typography>
                        </Box>
                    )}
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'grey.50',
                                        borderBottom: '2px solid',
                                        borderBottomColor: 'primary.main'
                                    }}
                                >
                                    PC ID
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'grey.50',
                                        borderBottom: '2px solid',
                                        borderBottomColor: 'primary.main'
                                    }}
                                >
                                    Process Name
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'grey.50',
                                        borderBottom: '2px solid',
                                        borderBottomColor: 'primary.main'
                                    }}
                                >
                                    Action
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'grey.50',
                                        borderBottom: '2px solid',
                                        borderBottomColor: 'primary.main'
                                    }}
                                >
                                    Start Time
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'grey.50',
                                        borderBottom: '2px solid',
                                        borderBottomColor: 'primary.main'
                                    }}
                                >
                                    End Time
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs && logs.length > 0 ? (
                                logs.map((log) => (
                                    <TableRow 
                                        key={log.id} 
                                        hover
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: 'action.hover'
                                            }
                                        }}
                                    >
                                        <TableCell 
                                            sx={{ 
                                                fontSize: '0.875rem',
                                                color: 'text.primary'
                                            }}
                                        >
                                            {log.pc_id} ({log.pc_name})
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                fontSize: '0.875rem',
                                                color: 'text.primary'
                                            }}
                                        >
                                            {log.application_display_name || log.application_name}
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                fontSize: '0.875rem',
                                                color: 'text.primary'
                                            }}
                                        >
                                            {log.action}
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                fontSize: '0.875rem',
                                                color: 'text.primary'
                                            }}
                                        >
                                            {formatTime(log.local_timestamp)}
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                fontSize: '0.875rem',
                                                color: 'text.primary'
                                            }}
                                        >
                                            {formatTime(log.end_time)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell 
                                        colSpan={5} 
                                        align="center"
                                        sx={{ 
                                            py: 4,
                                            color: 'text.secondary',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        No process logs available
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ProcessLogs; 