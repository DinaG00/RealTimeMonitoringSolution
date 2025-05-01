using System;
using System.Management;
using System.Threading;
using System.Diagnostics;
using System.IO;
using System.Media;

namespace MonitoringService
{
    public class UsbMonitor
    {
        private Thread _usbWatcherThread;
        private ManagementEventWatcher _usbWatcher;
        private EventLog _eventLog;  
        private bool _isRunning;     

        public UsbMonitor()
        {
            _eventLog = new EventLog();  
            _eventLog.Source = "UsbMonitoringService";  
            _isRunning = false;          
        }

        public void StartUsbDetection()
        {
            if (_isRunning)
            {
                _eventLog.WriteEntry("USB monitoring is already running.", EventLogEntryType.Warning);
                return;  // If already running, don't start a new thread
            }

            _usbWatcherThread = new Thread(() =>
            {
                try
                {
                    WqlEventQuery query = new WqlEventQuery("SELECT * FROM Win32_VolumeChangeEvent WHERE EventType = 2");
                    _usbWatcher = new ManagementEventWatcher(query);
                    _usbWatcher.EventArrived += OnUsbInserted;
                    _usbWatcher.Start();
                    _isRunning = true;
                    _eventLog.WriteEntry("USB detection started.");
                }
                catch (Exception ex)
                {
                    _eventLog.WriteEntry("Error in USB detection thread: " + ex.Message, EventLogEntryType.Error);
                }
            });

            _usbWatcherThread.IsBackground = true;
            _usbWatcherThread.Start();
        }

        private void OnUsbInserted(object sender, EventArrivedEventArgs e)
        {
            _eventLog.WriteEntry("USB Device Inserted!");
            ApiLogger.Log("USB", "USB device inserted!");
            PlayBeepSoundForFiveSeconds();
        }

        private void PlayBeepSoundForFiveSeconds()
        {
            try
            {
                using (SoundPlayer player = new SoundPlayer(@"C:\Users\Dina\Documents\CSIE\licenta\application\RealTimeMonitoryingSolution\MonitoringService\warning-sound.wav"))
                {
                    player.Play();
                    Thread.Sleep(5000);
                    player.Stop();
                }
                _eventLog.WriteEntry("Beep sound played for 5 seconds.");
            }
            catch (Exception ex)
            {
                _eventLog.WriteEntry("Error playing beep sound: " + ex.Message, EventLogEntryType.Error);
            }
        }

        public void StopUsbDetection()
        {
            if (!_isRunning)
            {
                _eventLog.WriteEntry("USB monitoring is not running.", EventLogEntryType.Warning);
                return; 
            }

            try
            {
                _usbWatcher?.Stop();
                _usbWatcher?.Dispose();
                _usbWatcherThread?.Abort(); // Not the most graceful way, but it stops the thread
                _isRunning = false;
                _eventLog.WriteEntry("USB detection stopped.");
            }
            catch (Exception ex)
            {
                _eventLog.WriteEntry("Error stopping USB detection: " + ex.Message, EventLogEntryType.Error);
            }
        }
    }
}
