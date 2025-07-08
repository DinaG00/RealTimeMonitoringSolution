using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using System.Configuration;

namespace MonitoringService
{
    public static class ApiLogger
    {
        private static readonly HttpClient client;
        private static readonly string pcId = Environment.MachineName;
        private static HashSet<string> _blacklistedApplications = new HashSet<string>();
        private static DateTime _lastBlacklistFetch = DateTime.MinValue;
        private static readonly TimeSpan _blacklistRefreshInterval = TimeSpan.FromMinutes(5);
        private static readonly string backendBaseUrl = ConfigurationManager.AppSettings["BackendBaseUrl"];

        static ApiLogger()
        {
            client = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(30)
            };

            Task.Run(() => FetchBlacklistAsync());
        }

        public static void Log(string type, string data)
        {
            EventLog.WriteEntry("ApiLogger", $"Attempting to log {type} event with data: {data}", EventLogEntryType.Information);
            Task.Run(() => SendLogAsync(type, data));
        }

        public static async Task<HashSet<string>> GetBlacklistedApplicationsAsync()
        {
            if (DateTime.Now - _lastBlacklistFetch > _blacklistRefreshInterval)
            {
                await FetchBlacklistAsync();
            }
            return _blacklistedApplications;
        }

        private static async Task FetchBlacklistAsync()
        {
            try
            {
                EventLog.WriteEntry("ApiLogger", "Fetching blacklist from server...", EventLogEntryType.Information);
                var response = await client.GetAsync($"{backendBaseUrl}/application-lists/blacklist");

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var blacklist = JsonConvert.DeserializeObject<List<string>>(content); // <-- Changed
                    _blacklistedApplications = new HashSet<string>(blacklist, StringComparer.OrdinalIgnoreCase);
                    _lastBlacklistFetch = DateTime.Now;
                    EventLog.WriteEntry("ApiLogger", $"Successfully fetched blacklist with {_blacklistedApplications.Count} applications", EventLogEntryType.Information);
                }
                else
                {
                    EventLog.WriteEntry("ApiLogger", $"Failed to fetch blacklist. Status code: {response.StatusCode}", EventLogEntryType.Warning);
                }
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("ApiLogger", $"Error fetching blacklist: {ex.Message}", EventLogEntryType.Error);
            }
        }

        private static async Task SendLogAsync(string type, string data)
        {
            try
            {
                string url = GetUrlForType(type);
                EventLog.WriteEntry("ApiLogger", $"Sending {type} log to {url}", EventLogEntryType.Information);

                object logData = null;

                switch (type)
                {
                    case "USB":
                        logData = CreateUsbLogData(data);
                        break;
                    case "Clipboard":
                        logData = await CreateClipboardLogData(data);
                        break;
                    case "ProcessStart":
                    case "ProcessEnd":
                        logData = await CreateProcessLogData(type, data);
                        break;
                    case "Download":
                        logData = await CreateDownloadLogData(data);
                        break;
                    default:
                        logData = CreateGeneralLogData(data);
                        break;
                }

                if (logData == null)
                {
                    EventLog.WriteEntry("ApiLogger", $"Log data is null. Skipping log for type {type}", EventLogEntryType.Warning);
                    return;
                }

                var json = JsonConvert.SerializeObject(logData); // <-- Changed
                EventLog.WriteEntry("ApiLogger", $"Request content: {json}", EventLogEntryType.Information);

                var content = new StringContent(json, Encoding.UTF8, "application/json");
                EventLog.WriteEntry("ApiLogger", "Sending HTTP request...", EventLogEntryType.Information);

                var response = await client.PostAsync(url, content);
                var responseContent = await response.Content.ReadAsStringAsync();
                EventLog.WriteEntry("ApiLogger", $"Received response: {responseContent}", EventLogEntryType.Information);

                if (!response.IsSuccessStatusCode)
                {
                    EventLog.WriteEntry("ApiLogger", $"API returned {response.StatusCode}: {responseContent}", EventLogEntryType.Warning);
                    throw new Exception($"API returned {response.StatusCode}: {responseContent}");
                }
                else
                {
                    EventLog.WriteEntry("ApiLogger", $"Successfully logged {type} event. Response: {responseContent}", EventLogEntryType.Information);
                }
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("ApiLogger", $"Error: {ex.Message}\nStack trace: {ex.StackTrace}", EventLogEntryType.Error);
            }
        }

        private static string GetUrlForType(string type)
        {
            switch (type)
            {
                case "USB":
                    return $"{backendBaseUrl}/logs/usb";
                case "Clipboard":
                    return $"{backendBaseUrl}/logs/clipboard";
                case "ProcessStart":
                case "ProcessEnd":
                    return $"{backendBaseUrl}/logs/processes";
                case "Download":
                    return $"{backendBaseUrl}/logs/downloads";
                default:
                    return $"{backendBaseUrl}/logs/general";
            }
        }

        private static object CreateUsbLogData(string data)
        {
            return new { pc = pcId, data = data };
        }

        private static async Task<object> CreateClipboardLogData(string data)
        {
            if (string.IsNullOrEmpty(data))
            {
                EventLog.WriteEntry("ApiLogger", "Empty clipboard data received", EventLogEntryType.Warning);
                return null;
            }
            return new { pc = pcId, content = data };
        }

        private static async Task<object> CreateProcessLogData(string type, string data)
        {
            var processParts = data.Split('|');
            if (processParts.Length < 2 || string.IsNullOrWhiteSpace(processParts[0]))
            {
                EventLog.WriteEntry("ApiLogger", $"Invalid process data format. Expected at least 2 parts and a non-empty process name, got {processParts.Length}. Data: {data}", EventLogEntryType.Warning);
                return null;
            }

            string processName = processParts[0].Trim();
            string windowTitle = processParts.Length > 1 ? processParts[1].Trim() : "";
            var now = DateTime.Now;

            return new
            {
                pc = pcId,
                process_name = processName,
                window_title = windowTitle,
                action = type,
                start_time = type == "ProcessStart" ? (DateTime?)now : null,
                end_time = type == "ProcessEnd" ? (DateTime?)now : null
            };
        }

        private static async Task<object> CreateDownloadLogData(string filePath)
        {
            if (!File.Exists(filePath))
            {
                EventLog.WriteEntry("ApiLogger", $"File {filePath} not found for download logging.", EventLogEntryType.Warning);
                return null;
            }

            var fileInfo = new FileInfo(filePath);
            string fileType = fileInfo.Extension.ToLower();

            string fileContent = "";
            if (fileType == ".txt" || fileType == ".log" || fileType == ".csv" || fileType == ".json" || fileType == ".xml")
            {
                try
                {
                    var lines = File.ReadLines(filePath).Take(3);
                    fileContent = string.Join(Environment.NewLine, lines);
                }
                catch (Exception ex)
                {
                    EventLog.WriteEntry("ApiLogger", $"Error reading file content for {filePath}: {ex.Message}", EventLogEntryType.Error);
                }
            }
            return new
            {
                pc = pcId,
                file_name = fileInfo.Name,
                file_type = fileType,
                content = fileContent,
                timestamp = DateTime.Now
            };
        }

        private static object CreateGeneralLogData(string data)
        {
            return new { pc = pcId, data = data };
        }

        public static void Dispose()
        {
            client.Dispose();
        }
    }
}