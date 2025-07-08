using System;
using System.IO;
using System.Runtime.InteropServices;

namespace MonitoringService
{
    public static class UserFoldersHelper
    {
        [DllImport("Wtsapi32.dll")]
        private static extern bool WTSQuerySessionInformation(IntPtr hServer, int sessionId, WTS_INFO_CLASS wtsInfoClass, out IntPtr ppBuffer, out int pBytesReturned);

        [DllImport("Wtsapi32.dll")]
        private static extern void WTSFreeMemory(IntPtr pointer);

        [DllImport("kernel32.dll")]
        private static extern int WTSGetActiveConsoleSessionId();

        private enum WTS_INFO_CLASS
        {
            WTSUserName = 5,
            WTSDomainName = 7
        }

        public static string GetActiveUsername()
        {
            int sessionId = WTSGetActiveConsoleSessionId();
            IntPtr buffer;
            int strLen;
            if (WTSQuerySessionInformation(IntPtr.Zero, sessionId, WTS_INFO_CLASS.WTSUserName, out buffer, out strLen) && strLen > 1)
            {
                string username = Marshal.PtrToStringAnsi(buffer);
                WTSFreeMemory(buffer);
                return username;
            }
            return null;
        }

        public static string GetUserFolder(string folderName)
        {
            string username = GetActiveUsername();
            if (string.IsNullOrEmpty(username))
                throw new Exception("Could not determine active username.");

            string userProfile = Path.Combine(@"C:\Users", username);
            return Path.Combine(userProfile, folderName);
        }

        public static string GetDownloadsFolder() => GetUserFolder("Downloads");
        public static string GetDocumentsFolder() => GetUserFolder("Documents");
        public static string GetPicturesFolder() => GetUserFolder("Pictures");
    }
}
