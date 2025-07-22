# RealTime Monitoring Solution

This project provides a real-time monitoring solution for **clipboard**, **USB**, **downloads**, and **processes** on Windows systems.  

It includes:
- A **Windows service** for background monitoring.
- A **console app** for clipboard monitoring.
- A **web application** for log visualization and management.

---

##  Project Structure

- ClipboardMonitor: Python service for clipboard monitoring, does not bypass Windows Permissions

- RealTimeMonitoringSolution:
  MonitoringService: C# 4.7, .NET Windows Service for monitoring clipboard, USB, downloads, and processes
  ClipboardConsoleApp: C# 4.7, .NET console app for clipboard monitoring, does not bypass Windows Permissions

- MonitoringWebApp:
  backend: Node.js/Express API
  frontend: React app with MUI theme for the UI
  database: SQLite database and initialization scripts


##  Copyright

&copy; 2025 Gavrilescu Dina.  
All rights reserved.  

This software is proprietary and may not be copied, modified, or distributed without the author's permission.

---
