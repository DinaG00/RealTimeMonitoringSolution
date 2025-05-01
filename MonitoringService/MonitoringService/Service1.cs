using System;
using System.Diagnostics;
using System.ServiceProcess;

namespace MonitoringService
{
    public partial class Service1 : ServiceBase
    {
        private UsbMonitor _usbMonitor;
        private ClipboardMonitor _clipboardMonitor;
        private ProcessMonitor _processMonitor;
        private DownloadsMonitor _downloadsMonitor;

        public Service1()
        {
            InitializeComponent();
            this.ServiceName = "UsbAndClipboardDetectionService";
        }

        private void EnsureEventLogSources()
        {
            string[] sources = { "UsbAndClipboardDetectionService", "ApiLogger", "DownloadsMonitor" };

            foreach (var source in sources)
            {
                if (!EventLog.SourceExists(source))
                {
                    EventLog.CreateEventSource(source, "Application");
                }
            }
        }

        protected override void OnStart(string[] args)
        {
            try
            {
                EnsureEventLogSources();
                EventLog.WriteEntry("UsbAndClipboardDetectionService", "Service is starting...");

                _usbMonitor = new UsbMonitor();
                _usbMonitor.StartUsbDetection();

                _clipboardMonitor = new ClipboardMonitor();
                _clipboardMonitor.StartClipboardMonitoring();

                _processMonitor = new ProcessMonitor();
                _processMonitor.StartProcessMonitoring();

                _downloadsMonitor = new DownloadsMonitor();
                _downloadsMonitor.StartMonitoring();

                EventLog.WriteEntry("UsbAndClipboardDetectionService", "Service has started successfully.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("UsbAndClipboardDetectionService", "Error in OnStart: " + ex.Message, EventLogEntryType.Error);
            }
        }


        protected override void OnStop()
        {
            try
            {
                EventLog.WriteEntry("Service is stopping...");

                _usbMonitor?.StopUsbDetection();
                _clipboardMonitor?.StopClipboardMonitoring();
                _processMonitor?.StopProcessMonitoring();
                _downloadsMonitor?.StopMonitoring();

                EventLog.WriteEntry("Service has stopped.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStop: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
