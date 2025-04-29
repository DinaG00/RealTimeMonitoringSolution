import React, { useState, useEffect } from 'react';
import { Table, Container, Typography, Paper } from '@mui/material';
import { format } from 'date-fns';

const UsbLogs = () => {
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('http://localhost:5001/logs/usb');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setLogs(Array.isArray(data) ? data : []);
                setError(null);
            } catch (error) {
                console.error('Error fetching USB logs:', error);
                setError('Failed to fetch USB logs');
                setLogs([]);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                USB Logs
            </Typography>
            {error && (
                <Typography color="error" gutterBottom>
                    {error}
                </Typography>
            )}
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <Table>
                    <thead>
                        <tr>
                            <th>PC ID</th>
                            <th>Action</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs && logs.length > 0 ? (
                            logs.map((log) => (
                                <tr key={log.id}>
                                    <td>{log.pc_id}</td>
                                    <td>{log.action}</td>
                                    <td>{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center' }}>
                                    No USB logs available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Paper>
        </Container>
    );
};

export default UsbLogs; 