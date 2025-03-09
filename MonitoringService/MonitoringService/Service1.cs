using System;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Media;
using System.ServiceProcess;
using System.Threading;

namespace MonitoringService
{
    public partial class Service1 : ServiceBase
    {
        private Thread _usbWatcherThread;  // Thread for handling USB detection
        private ManagementEventWatcher _usbWatcher;  // Watcher for USB insertions
        private string _lastFileProcessed = "";

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

                // Start USB detection
                StartUsbDetection();

                // Start the console app to monitor clipboard content
                StartClipboardMonitoringConsoleApp();

                EventLog.WriteEntry("Service has started successfully.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStart: " + ex.Message, EventLogEntryType.Error);
            }
        }

        private void StartUsbDetection()
        {
            _usbWatcherThread = new Thread(() =>
            {
                try
                {
                    WqlEventQuery query = new WqlEventQuery("SELECT * FROM Win32_VolumeChangeEvent WHERE EventType = 2"); // EventType 2 is USB inserted
                    _usbWatcher = new ManagementEventWatcher(query);
                    _usbWatcher.EventArrived += OnUsbInserted;  // Event handler when USB inserted
                    _usbWatcher.Start();
                    EventLog.WriteEntry("USB detection started.");
                }
                catch (Exception ex)
                {
                    EventLog.WriteEntry("Error in USB detection thread: " + ex.Message, EventLogEntryType.Error);
                }
            });

            _usbWatcherThread.IsBackground = true;
            _usbWatcherThread.Start();
        }

        private void OnUsbInserted(object sender, EventArrivedEventArgs e)
        {
            // Event log for USB inserted
            EventLog.WriteEntry("USB Device Inserted!");

            // Play warning sound for 5 seconds
            PlayBeepSoundForFiveSeconds();
        }

        private void PlayBeepSoundForFiveSeconds()
        {
            try
            {
                using (SoundPlayer player = new SoundPlayer(@"C:\Users\Dina\Documents\CSIE\licenta\application\RealTimeMonitoryingSolution\MonitoringService\warning-sound.wav"))
                {
                    player.Play();  // Start playing asynchronously
                    Thread.Sleep(5000); // Keep playing for 5 seconds
                    player.Stop();
                }
                EventLog.WriteEntry("Beep sound played for 5 seconds.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error playing beep sound: " + ex.Message, EventLogEntryType.Error);
            }
        }

        private void StartClipboardMonitoringConsoleApp()
        {
            try
            {
                string consoleAppPath = @"C:\Users\Dina\Documents\CSIE\licenta\application\RealTimeMonitoryingSolution\MonitoringService\ClipboardConsoleApp\ClipboardConsoleApp\bin\Debug\ClipboardConsoleApp.exe";

                // Create and start the process
                Process process = new Process();
                process.StartInfo.FileName = consoleAppPath;
                process.StartInfo.UseShellExecute = false; // Ensure it doesn't use the shell
                process.StartInfo.CreateNoWindow = true; // Don't show a window
                process.Start();
                

                EventLog.WriteEntry("Clipboard monitoring console app started.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error starting clipboard monitoring console app: " + ex.Message, EventLogEntryType.Error);
            }
        }

        protected override void OnStop()
        {
            try
            {
                EventLog.WriteEntry("Service is stopping...");

                // Stop USB detection
                if (_usbWatcher != null)
                {
                    _usbWatcher.Stop();
                    _usbWatcher.Dispose();
                }

                EventLog.WriteEntry("Service has stopped.");
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("Error in OnStop: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
