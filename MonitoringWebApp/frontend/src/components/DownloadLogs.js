import React, { useState, useEffect } from 'react';
import { 
    Table, 
    Typography, 
    TableHead, 
    TableBody, 
    TableRow, 
    TableCell,
    Box,
    Card,
    CardContent 
} from '@mui/material';
import { format } from 'date-fns';

const DownloadLogs = () => {
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('http://localhost:5001/logs/downloads');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setLogs(Array.isArray(data) ? data : []);
                setError(null);
            } catch (error) {
                console.error('Error fetching download logs:', error);
                setError('Failed to fetch download logs');
                setLogs([]);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);

        return () => clearInterval(interval);
    }, []);

    const formatTime = (timestamp) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return format(date, 'yyyy-MM-dd HH:mm:ss');
    };

    return (
        <>
            <Typography
                variant="h4"
                component="h1"
                sx={{
                    mb: 4,
                    fontWeight: 600,
                    color: 'text.primary',
                }}
            >
                Download Logs
            </Typography>
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
                                    File Name
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
                                    File Type
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
                                    Content Preview
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
                                    Time
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
                                            {log.pc}
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                fontSize: '0.875rem',
                                                color: 'text.primary'
                                            }}
                                        >
                                            {log.file_name}
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                fontSize: '0.875rem',
                                                color: 'text.primary'
                                            }}
                                        >
                                            {log.file_type}
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                fontSize: '0.875rem',
                                                color: 'text.primary',
                                                maxWidth: '300px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {log.content || 'No preview available'}
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                fontSize: '0.875rem',
                                                color: 'text.primary'
                                            }}
                                        >
                                            {formatTime(log.timestamp)}
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
                                        No download logs available
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
};

export default DownloadLogs; 