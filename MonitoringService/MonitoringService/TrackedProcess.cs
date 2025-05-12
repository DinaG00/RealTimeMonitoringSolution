using System;

namespace MonitoringService
{
    public class TrackedProcess
    {
        public int Id { get; set; }
        public string ProcessName { get; set; }
        public string WindowTitle { get; set; }
        public DateTime StartTime { get; set; }
        public bool IsBlacklisted { get; set; }
    }
}