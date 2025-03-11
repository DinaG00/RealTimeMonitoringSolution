using System;
using System.ServiceProcess;

namespace MonitoringService
{
    static class Program
    {
        static void Main()
        {
            ServiceBase[] ServicesToRun;
            ServicesToRun = new ServiceBase[]
            {
                new Service1()  
            };
            ServiceBase.Run(ServicesToRun);
        }
    }
}
