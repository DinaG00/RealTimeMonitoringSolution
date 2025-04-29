using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MonitoringService
{
    class TrackedProcess
    {
        public int Id { get; set; }
        public string ProcessName { get; set; }
        public string WindowTitle { get; set; }
        public DateTime StartTime { get; set; }
    }
}
