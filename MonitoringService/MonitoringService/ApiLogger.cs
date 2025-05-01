using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using System.Linq;

namespace MonitoringService
{
    public static class ApiLogger
    {
        private static readonly HttpClient client;
        private static readonly string pcId = Environment.MachineName;

        static ApiLogger()
        {
            client = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(30)
            };
        }

        public static void Log(string type, string data)
        {
            EventLog.WriteEntry("ApiLogger", $"Attempting to log {type} event with data: {data}", EventLogEntryType.Information);
            _ = SendLogAsync(type, data);
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

                var json = System.Text.Json.JsonSerializer.Serialize(logData);
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
            // Return the appropriate URL based on the log type
            switch (type)
            {
                case "USB":
                    return "http://localhost:5001/logs/usb";
                case "Clipboard":
                    return "http://localhost:5001/logs/clipboard";
                case "ProcessStart":
                case "ProcessEnd":
                    return "http://localhost:5001/logs/processes";
                case "Download":
                    return "http://localhost:5001/logs/downloads";
                default:
                    return "http://localhost:5001/logs/general";
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
                start_time = type == "ProcessStart" ? now : (DateTime?)null,
                end_time = type == "ProcessEnd" ? now : (DateTime?)null
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
                    var lines = File.ReadLines(filePath).Take(3); // Read the first 3 lines
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
