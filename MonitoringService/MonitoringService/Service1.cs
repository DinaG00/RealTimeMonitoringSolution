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

        public Service1()
        {
            InitializeComponent();
            this.ServiceName = "UsbAndClipboardDetectionService";
        }

        protected override void OnStart(string[] args)
        {
            try
            {
                EventLog.WriteEntry("Service is starting...");

                _usbMonitor = new UsbMonitor();
                _usbMonitor.StartUsbDetection();

                _clipboardMonitor = new ClipboardMonitor();
                _clipboardMonitor.StartClipboardMonitoring();

                _processMonitor = new ProcessMonitor();
                _processMonitor.StartProcessMonitoring();

                EventLog.WriteEntry("Service has started successfully.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStart: " + ex.Message, EventLogEntryType.Error);
            }
        }

        protected override void OnStop()
        {
            try
            {
                EventLog.WriteEntry("Service is stopping...");

                _usbMonitor.StopUsbDetection();
                _clipboardMonitor.StopClipboardMonitoring();
                _processMonitor.StopProcessMonitoring();

                EventLog.WriteEntry("Service has stopped.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStop: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
