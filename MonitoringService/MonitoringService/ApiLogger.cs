using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

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

                object logData;
                switch (type)
                {
                    case "USB":
                        logData = new
                        {
                            pc = pcId,
                            action = data
                        };
                        break;

                    case "Clipboard":
                        if (string.IsNullOrEmpty(data))
                        {
                            EventLog.WriteEntry("ApiLogger", "Empty clipboard data received", EventLogEntryType.Warning);
                            return;
                        }
                        logData = new
                        {
                            pc = pcId,
                            content = data
                        };
                        break;

                    case "ProcessStart":
                    case "ProcessEnd":
                        EventLog.WriteEntry("ApiLogger", $"Processing {type} event with data: {data}", EventLogEntryType.Information);

                        var processParts = data.Split('|');
                        if (processParts.Length < 2 || string.IsNullOrWhiteSpace(processParts[0]))
                        {
                            EventLog.WriteEntry("ApiLogger", $"Invalid process data format. Expected at least 2 parts and a non-empty process name, got {processParts.Length}. Data: {data}", EventLogEntryType.Warning);
                            return;
                        }

                        string processName = processParts[0].Trim();
                        string windowTitle = processParts.Length > 1 ? processParts[1].Trim() : "";

                        if (string.IsNullOrEmpty(processName) || processName.Equals("Idle", StringComparison.OrdinalIgnoreCase))
                        {
                            EventLog.WriteEntry("ApiLogger", $"Skipping unwanted process (process name: {processName})", EventLogEntryType.Information);
                            return;
                        }

                        var now = DateTime.Now;
                        logData = new
                        {
                            pc = pcId,
                            process_name = processName,
                            window_title = windowTitle,
                            action = type,
                            start_time = type == "ProcessStart" ? now : (DateTime?)null,
                            end_time = type == "ProcessEnd" ? now : (DateTime?)null
                        };

                        EventLog.WriteEntry("ApiLogger", $"Created process log data: {System.Text.Json.JsonSerializer.Serialize(logData)}", EventLogEntryType.Information);
                        break;

                    default:
                        EventLog.WriteEntry("ApiLogger", $"Unknown log type: {type}", EventLogEntryType.Warning);
                        logData = new { pc = pcId, data = data };
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
            catch (HttpRequestException ex)
            {
                EventLog.WriteEntry("ApiLogger", $"HTTP request error: {ex.Message}\nStack trace: {ex.StackTrace}", EventLogEntryType.Error);
            }
            catch (TimeoutException ex)
            {
                EventLog.WriteEntry("ApiLogger", $"Request timeout: {ex.Message}\nStack trace: {ex.StackTrace}", EventLogEntryType.Error);
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry("ApiLogger", $"Failed to send log to API: {ex.Message}\nStack trace: {ex.StackTrace}", EventLogEntryType.Error);
            }
        }

        private static string GetUrlForType(string type)
        {
            if (type == "USB")
                return "http://localhost:5001/logs/usb";
            else if (type == "Clipboard")
                return "http://localhost:5001/logs/clipboard";
            else if (type == "ProcessStart" || type == "ProcessEnd")
                return "http://localhost:5001/logs/processes";
            else
                return "http://localhost:5001/logs/general";
        }

        public static void Dispose()
        {
            client.Dispose();
        }
    }
}