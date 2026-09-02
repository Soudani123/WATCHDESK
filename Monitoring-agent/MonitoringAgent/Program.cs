#pragma warning disable CA1416
using System;
using System.Diagnostics;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Management;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Windows.Forms;
using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics.Eventing.Reader;
using System.Reflection;
using Microsoft.Win32;

namespace MonitoringAgent
{
    class Program
    {
        static string BASE_URL = "http://localhost:8080";
        static string API_URL = "http://localhost:8080/api/agent/report";
        const string API_KEY = "watchdesk-secret-key-2026";
        static string LOG_FILE = @"C:\WatchDesk\agent.log";
        static string _cachedLocalIp = "";
        static List<InstalledApp> _softwareCache = new();
        static List<PendingUpdate> _updatesCache = new();
        static string _osVersion = "";
        static string _osBuild = "";
        static int _pollMs = 10000;

        [STAThread]
        static async Task Main(string[] args)
        {
            try
            {
                EnsureDirectory();
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] === AGENT DEMARRE ===\n");

                ParseArguments(args);
                _cachedLocalIp = GetLocalIPAddress();
                StartInventoryLoop();

                Console.WriteLine($"[INIT] IP locale détectée : {_cachedLocalIp}");
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] IP Détectée : {_cachedLocalIp}\n");

                while (true)
                {
                    try
                    {
                        // 1. Collecte et envoi des métriques
                        AgentData data = CollectData();
                        await SendToApi(data);

                        string msg = $"[{DateTime.Now:HH:mm:ss}] Envoyé - IP:{data.Ip} - RiskScore:{data.RiskScore} - Source:{data.AppName} - Status:{data.Status}";
                        Console.WriteLine(msg);
                        File.AppendAllText(LOG_FILE, msg + "\n");

                        // 2. Vérification des ordres émis par le Super Admin
                        await CheckPendingTasks(_cachedLocalIp);
                    }
                    catch (HttpRequestException ex)
                    {
                        string err = $"[{DateTime.Now:HH:mm:ss}] [ERREUR CONNEXION] {ex.Message}";
                        Console.WriteLine(err);
                        File.AppendAllText(LOG_FILE, err + "\n");
                    }
                    catch (Exception ex)
                    {
                        string err = $"[{DateTime.Now:HH:mm:ss}] [ERREUR] {ex.GetType().Name}: {ex.Message}";
                        Console.WriteLine(err);
                        File.AppendAllText(LOG_FILE, err + "\n");
                    }

                    await RefreshPollInterval();
                    await Task.Delay(_pollMs);
                }
            }
            catch (Exception fatal)
            {
                string fatalErr = $"[{DateTime.Now}] [ERREUR FATALE] {fatal.Message}";
                Console.WriteLine(fatalErr);
                File.AppendAllText(LOG_FILE, fatalErr + "\n");
                Console.ReadKey();
            }
        }

        static void ParseArguments(string[] args)
        {
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--server" && i + 1 < args.Length)
                {
                    BASE_URL = args[i + 1].TrimEnd('/');
                    API_URL = BASE_URL + "/api/agent/report";
                }
            }
        }

        static string GetLocalIPAddress()
        {
            try
            {
                using (var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    var endPoint = socket.LocalEndPoint as IPEndPoint;
                    if (endPoint != null) return endPoint.Address.ToString();
                }
            }
            catch
            {
                try
                {
                    var host = Dns.GetHostEntry(Dns.GetHostName());
                    foreach (var ip in host.AddressList)
                    {
                        if (ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip))
                            return ip.ToString();
                    }
                }
                catch { }
            }
            return "127.0.0.1";
        }

        // =========================================================================
        // NOUVEAU : Lecture ciblée d'un journal Windows via EventLogReader (XPath)
        // =========================================================================
        static string MapEventLevel(byte? level, string? displayName)
        {
            return level switch
            {
                1 => "CRITIQUE",
                2 => "ERREUR",
                3 => "AVERTISSEMENT",
                _ => (displayName ?? "").ToLowerInvariant() switch
                {
                    "critical" or "critique" => "CRITIQUE",
                    "error" or "erreur" => "ERREUR",
                    "warning" or "avertissement" => "AVERTISSEMENT",
                    _ => "ERREUR"
                }
            };
        }

        static string FetchLogEntries(string logName, int maxEvents = 50)
        {
            var sb = new StringBuilder();
            int count = 0;

            // XPath correct : Level 1 Critique, 2 Erreur, 3 Avertissement — 7 derniers jours
            // timediff(@SystemTime) est la syntaxe officielle (en millisecondes).
            string xpathQuery = "*[System[(Level=1 or Level=2 or Level=3) and TimeCreated[timediff(@SystemTime) <= 604800000]]]";

            try
            {
                var query = new EventLogQuery(logName, PathType.LogName, xpathQuery)
                {
                    ReverseDirection = true
                };

                using var reader = new EventLogReader(query);
                for (EventRecord ev = reader.ReadEvent(); ev != null && count < maxEvents; ev = reader.ReadEvent())
                {
                    using (ev)
                    {
                        count++;
                        string levelName = MapEventLevel(ev.Level, ev.LevelDisplayName);
                        string time = ev.TimeCreated.HasValue
                            ? ev.TimeCreated.Value.ToString("yyyy-MM-dd HH:mm:ss")
                            : DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                        string provider = ev.ProviderName ?? "Inconnu";
                        int eventId = ev.Id;

                        string msg = "Message non formatable par le système.";
                        try { msg = ev.FormatDescription(); } catch { }

                        sb.AppendLine($"[{time}] [{levelName}] [ID:{eventId}] {provider}");
                        sb.AppendLine($"  {msg}");
                        sb.AppendLine(new string('-', 50));
                    }
                }
            }
            catch (UnauthorizedAccessException)
            {
                return $"[ACCÈS REFUSÉ] Le journal '{logName}' nécessite des droits administrateur. " +
                       "Exécutez l'agent en tant qu'Administrateur pour lire ce journal.";
            }
            catch (Exception ex)
            {
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Erreur EventLogReader sur {logName}: {ex.Message}\n");
                return FetchLogEntriesLegacy(logName, maxEvents, ex.Message);
            }

            if (count == 0)
                return FetchLogEntriesLegacy(logName, maxEvents, null);

            return sb.ToString();
        }

        /// <summary>
        /// Repli via l'API EventLog classique (identique à l'Observateur : Erreur / Avertissement / Audit échec).
        /// </summary>
        static string FetchLogEntriesLegacy(string logName, int maxEvents, string? previousError)
        {
            var sb = new StringBuilder();
            int count = 0;
            DateTime cutoff = DateTime.Now.AddDays(-7);

            try
            {
                using var log = new EventLog(logName);
                EventLogEntryCollection entries = log.Entries;
                int total = entries.Count;

                for (int i = total - 1; i >= 0 && count < maxEvents; i--)
                {
                    EventLogEntry entry;
                    try { entry = entries[i]; }
                    catch { continue; }

                    if (entry.TimeGenerated < cutoff)
                        break;

                    if (entry.EntryType != EventLogEntryType.Error
                        && entry.EntryType != EventLogEntryType.Warning
                        && entry.EntryType != EventLogEntryType.FailureAudit)
                    {
                        continue;
                    }

                    count++;
                    string levelName = entry.EntryType switch
                    {
                        EventLogEntryType.Error => "ERREUR",
                        EventLogEntryType.Warning => "AVERTISSEMENT",
                        EventLogEntryType.FailureAudit => "ERREUR",
                        _ => "ERREUR"
                    };

                    sb.AppendLine($"[{entry.TimeGenerated:yyyy-MM-dd HH:mm:ss}] [{levelName}] [ID:{entry.InstanceId}] {entry.Source}");
                    sb.AppendLine($"  {entry.Message}");
                    sb.AppendLine(new string('-', 50));
                }
            }
            catch (UnauthorizedAccessException)
            {
                return $"[ACCÈS REFUSÉ] Le journal '{logName}' nécessite des droits administrateur. " +
                       "Exécutez l'agent en tant qu'Administrateur pour lire ce journal.";
            }
            catch (Exception ex)
            {
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Erreur EventLog classique sur {logName}: {ex.Message}\n");
                if (!string.IsNullOrEmpty(previousError))
                    return $"[ERREUR LECTURE] Impossible d'ouvrir le journal '{logName}' : {previousError}";
                return $"[ERREUR LECTURE] Impossible d'ouvrir le journal '{logName}' : {ex.Message}";
            }

            if (count == 0)
                return $"Aucun événement critique récent dans le journal {logName}.";

            return sb.ToString();
        }

        // =========================================================================
        // Analyse du risque à partir des journaux Système + Application + Sécurité
        // =========================================================================
        static CriticalLogAnalysis AnalyzeRisk(string systemLogs, string appLogs, string securityLogs = "")
        {
            var analysis = new CriticalLogAnalysis();
            string combined = (systemLogs ?? "") + "\n" + (appLogs ?? "") + "\n" + (securityLogs ?? "");

            int errorCount = 0;
            string firstProvider = "";

            using (var sr = new StringReader(combined))
            {
                string line;
                while ((line = sr.ReadLine()) != null)
                {
                    if (line.Contains("[ERREUR]") || line.Contains("[CRITIQUE]") || line.Contains("[AVERTISSEMENT]"))
                    {
                        errorCount++;

                        if (string.IsNullOrEmpty(firstProvider))
                        {
                            // Extraction du provider : format [...] [ID:xx] Provider
                            int lastBracket = line.LastIndexOf(']');
                            if (lastBracket > 0 && lastBracket + 2 < line.Length)
                            {
                                firstProvider = line.Substring(lastBracket + 2).Trim();
                            }
                        }
                    }
                }
            }

            var cveMatches = Regex.Matches(combined, @"CVE-\d{4}-\d{4,}", RegexOptions.IgnoreCase)
                .Cast<Match>()
                .Select(m => m.Value.ToUpperInvariant())
                .Distinct()
                .Take(5)
                .ToList();

            if (errorCount > 0)
            {
                analysis.AppName = string.IsNullOrEmpty(firstProvider) ? "Système Windows" : firstProvider;
                analysis.AppVendor = firstProvider.StartsWith("Microsoft") ? "Microsoft Corporation" : "Éditeur Tiers / Windows";
                analysis.Cve = cveMatches.Count > 0 ? string.Join(", ", cveMatches) : "Aucune";
                analysis.RiskScore = Math.Min(100, errorCount * 10);
            }
            else
            {
                analysis.AppName = "Système Windows";
                analysis.AppVendor = "Microsoft Corporation";
                analysis.Cve = cveMatches.Count > 0 ? string.Join(", ", cveMatches) : "Aucune";
                analysis.RiskScore = 0;
            }

            return analysis;
        }

        static async Task CheckPendingTasks(string computerIp)
        {
            try
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(5);

                string activeIp = GetLocalIPAddress();
                string pcName = Environment.MachineName;

                string[] targets = new string[] { activeIp, computerIp, pcName, "192.168.1.178" };

                foreach (var id in targets.Distinct())
                {
                    if (string.IsNullOrEmpty(id)) continue;

                    string checkUrl = $"{BASE_URL}/api/agent/check-tasks/{id}";
                    var response = await client.GetAsync(checkUrl);

                    if (response.IsSuccessStatusCode)
                    {
                        string rawContent = await response.Content.ReadAsStringAsync();

                        int firstBrace = rawContent.IndexOf('{');
                        int lastBrace = rawContent.LastIndexOf('}');

                        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace)
                        {
                            string cleanJson = rawContent.Substring(firstBrace, (lastBrace - firstBrace) + 1);

                            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                            var taskResult = JsonSerializer.Deserialize<TaskResponse>(cleanJson, options);

                            if (taskResult != null && !string.IsNullOrEmpty(taskResult.Action) && taskResult.Action != "NONE")
                            {
                                string reasonMsg = string.IsNullOrEmpty(taskResult.Message) ? "Action ordonnée par l'administrateur" : taskResult.Message;
                                Console.WriteLine($"\n[🚀 ORDRE REÇU via {id}] Action : {taskResult.Action} | Raison: {reasonMsg}");
                                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Ordre reçu via {id} ! Action: {taskResult.Action}\n");

                                switch (taskResult.Action.ToUpper())
                                {
                                    case "UPDATE_WITH_REBOOT":
                                        ExecuteWindowsUpdate(rebootAfter: true, reasonMsg);
                                        break;

                                    case "UPDATE_WITHOUT_REBOOT":
                                        ExecuteWindowsUpdate(rebootAfter: false, reasonMsg);
                                        break;

                                    case "SCHEDULE_UPDATE":
                                    case "UPDATE":
                                        PromptUserForUpdate(id);
                                        break;

                                    case "SHUTDOWN":
                                        ExecuteShutdown(reasonMsg);
                                        break;

                                    case "RESTART":
                                        ExecuteRestart(reasonMsg);
                                        break;

                                    default:
                                        Console.WriteLine($"[AVERTISSEMENT] Action non reconnue : {taskResult.Action}");
                                        break;
                                }
                                break;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Erreur CheckPendingTasks: {ex.Message}\n");
            }
        }

        static void PromptUserForUpdate(string computerIp)
        {
            Thread t = new Thread(() =>
            {
                string caption = "WatchDesk - Mise à jour Windows";
                string message = "Une mise à jour système importante a été demandée par votre administrateur IT.\n\n" +
                                 "Voulez-vous lancer la mise à jour maintenant ?\n\n" +
                                 "• Oui : Démarrer immédiatement\n" +
                                 "• Non : Retarder de 30 minutes";

                DialogResult result = MessageBox.Show(
                    new Form { TopMost = true },
                    message,
                    caption,
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Information
                );

                string choice = (result == DialogResult.Yes) ? "IMMEDIATE" : "DELAYED_30MIN";
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] [MàJ Windows] Choix utilisateur : {choice}\n");

                _ = ReportUserChoice(computerIp, choice);

                if (choice == "IMMEDIATE")
                {
                    ExecuteWindowsUpdate();
                }
                else
                {
                    Task.Delay(30 * 60 * 1000).ContinueWith(_ => ExecuteWindowsUpdate());
                }
            });

            t.SetApartmentState(ApartmentState.STA);
            t.Start();
        }

        static void ExecuteShutdown(string reason)
        {
            try
            {
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] [ACTION ADMIN] Arrêt du PC. Raison: {reason}\n");

                MessageBox.Show(
                    new Form { TopMost = true },
                    $"⚠️ ACTION ADMINISTRATEUR CRITIQUE\n\nVotre ordinateur va s'éteindre dans 30 secondes.\n\nRaison : {reason}",
                    "WatchDesk - Arrêt du système",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                Process.Start(new ProcessStartInfo
                {
                    FileName = "shutdown.exe",
                    Arguments = $"/s /f /t 30 /c \"WatchDesk: {reason}\"",
                    CreateNoWindow = true,
                    UseShellExecute = false
                });
            }
            catch (Exception ex)
            {
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Erreur lors de l'arrêt : {ex.Message}\n");
            }
        }

        static void ExecuteRestart(string reason)
        {
            try
            {
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] [ACTION ADMIN] Redémarrage du PC. Raison: {reason}\n");

                MessageBox.Show(
                    new Form { TopMost = true },
                    $"⚠️ ACTION ADMINISTRATEUR\n\nVotre ordinateur va redémarrer dans 30 secondes.\n\nRaison : {reason}",
                    "WatchDesk - Redémarrage du système",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );

                Process.Start(new ProcessStartInfo
                {
                    FileName = "shutdown.exe",
                    Arguments = $"/r /f /t 30 /c \"WatchDesk: {reason}\"",
                    CreateNoWindow = true,
                    UseShellExecute = false
                });
            }
            catch (Exception ex)
            {
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Erreur lors du redémarrage : {ex.Message}\n");
            }
        }

        static void ExecuteWindowsUpdate(bool rebootAfter = false, string reason = "")
        {
            try
            {
                string mode = rebootAfter ? "AVEC redémarrage" : "SANS redémarrage";
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Lancement de la mise à jour Windows ({mode})...\n");

                Process.Start(new ProcessStartInfo
                {
                    FileName = "usoclient.exe",
                    Arguments = "StartInstall",
                    UseShellExecute = true,
                    Verb = "runas",
                    WindowStyle = ProcessWindowStyle.Hidden
                });

                Process.Start(new ProcessStartInfo
                {
                    FileName = "ms-settings:windowsupdate-action",
                    UseShellExecute = true
                });

                if (rebootAfter)
                {
                    string rebootReason = string.IsNullOrEmpty(reason)
                        ? "Mise à jour Windows WatchDesk"
                        : reason;

                    MessageBox.Show(
                        new Form { TopMost = true },
                        "⚠️ ACTION ADMINISTRATEUR\n\nLa mise à jour Windows a été lancée.\nVotre ordinateur va redémarrer dans 60 secondes.",
                        "WatchDesk - Mise à jour avec redémarrage",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );

                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "shutdown.exe",
                        Arguments = $"/r /f /t 60 /c \"WatchDesk: {rebootReason}\"",
                        CreateNoWindow = true,
                        UseShellExecute = false
                    });
                }
                else
                {
                    MessageBox.Show(
                        new Form { TopMost = true },
                        "La mise à jour Windows a été lancée.\nAucun redémarrage automatique ne sera effectué.",
                        "WatchDesk - Mise à jour sans redémarrage",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
            }
            catch (Exception ex)
            {
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Erreur lors du lancement de usoclient : {ex.Message}\n");
            }
        }

        static async Task ReportUserChoice(string ip, string choice)
        {
            try
            {
                using var client = new HttpClient();
                string statusUrl = $"{BASE_URL}/api/agent/report-update-status";
                var payload = new Dictionary<string, string>
                {
                    { "ip", ip },
                    { "userChoice", choice }
                };

                await client.PostAsJsonAsync(statusUrl, payload);
            }
            catch { }
        }

        static void EnsureDirectory()
        {
            try
            {
                string path = @"C:\WatchDesk";
                if (!Directory.Exists(path)) Directory.CreateDirectory(path);
            }
            catch { }
        }

        static AgentData CollectData()
        {
            string machine = Environment.MachineName;
            string user = Environment.UserName;
            if (string.IsNullOrEmpty(_cachedLocalIp))
                _cachedLocalIp = GetLocalIPAddress();

            // 1. CPU
            double cpuValue = 0;
            try
            {
                using (var cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total"))
                {
                    cpuCounter.NextValue();
                    Thread.Sleep(500);
                    cpuValue = cpuCounter.NextValue();
                }
            }
            catch
            {
                cpuValue = new Random().Next(5, 15);
            }

            // 2. RAM
            long ramAvailableMB = 2048;
            long ramTotalMB = 8192;

            try
            {
                using (var ramCounter = new PerformanceCounter("Memory", "Available MBytes"))
                {
                    ramAvailableMB = (long)ramCounter.NextValue();
                }

                var searcher = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem");
                foreach (var obj in searcher.Get())
                {
                    ramTotalMB = Convert.ToInt64(obj["TotalPhysicalMemory"]) / (1024 * 1024);
                }
            }
            catch
            {
                ramTotalMB = 16384;
                ramAvailableMB = 6144;
            }

            long ramUsedMB = ramTotalMB - ramAvailableMB;

            // 3. Disques
            List<DiskInfo> diskList = new List<DiskInfo>();
            foreach (var drive in DriveInfo.GetDrives())
            {
                if (drive.IsReady)
                {
                    diskList.Add(new DiskInfo
                    {
                        Name = drive.Name,
                        FreeGB = (int)(drive.AvailableFreeSpace / (1024 * 1024 * 1024)),
                        TotalGB = (int)(drive.TotalSize / (1024 * 1024 * 1024))
                    });
                }
            }
            DiskInfo[] disks = diskList.ToArray();

            // 4. Incidents matériels
            List<Incident> incidentList = new List<Incident>();

            if (cpuValue > 95)
                incidentList.Add(new Incident { Severity = "Elevee", Description = $"CPU {cpuValue:F1}%", Status = "Nouveau" });
            else if (cpuValue > 80)
                incidentList.Add(new Incident { Severity = "Moyenne", Description = $"CPU eleve {cpuValue:F1}%", Status = "Nouveau" });

            if (ramAvailableMB < 2048)
                incidentList.Add(new Incident { Severity = "Moyenne", Description = $"RAM faible ({ramAvailableMB}MB)", Status = "Nouveau" });

            foreach (var d in disks)
            {
                if (d.FreeGB < 10)
                    incidentList.Add(new Incident { Severity = "Elevee", Description = $"Disque {d.Name} critique", Status = "Nouveau" });
            }

            Incident[] incidents = incidentList.ToArray();

            string status = "online";
            if (incidents.Any(i => i.Severity == "Elevee"))
                status = "offline";
            else if (incidents.Length > 0)
                status = "warning";

            // 5. Collecte séparée des 3 journaux Windows (critiques + erreurs)
            string systemLogs = FetchLogEntries("System", 50);
            string appLogs = FetchLogEntries("Application", 50);
            string secLogs = FetchLogEntries("Security", 50); // Nécessite droits admin

            // 6. Analyse du risque basée sur les 3 journaux
            CriticalLogAnalysis riskAnalysis = AnalyzeRisk(systemLogs, appLogs, secLogs);

            if (_softwareCache.Count == 0)
            {
                try
                {
                    RefreshSoftwareInventory();
                }
                catch (Exception ex)
                {
                    File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Inventaire logiciels: {ex.Message}\n");
                }
            }

            return new AgentData
            {
                Ip = _cachedLocalIp,
                MachineName = machine,
                Username = user,
                PcName = machine,
                CpuUsage = cpuValue.ToString("F1") + " %",
                RamUsedMB = ramUsedMB,
                RamTotalMB = ramTotalMB,
                Status = status,
                Disks = disks,
                Incidents = incidents,
                Timestamp = DateTime.UtcNow,

                // Logs séparés et complets
                SystemLogs = systemLogs,
                AppLogs = appLogs,
                SecurityLogs = secLogs,

                // Métadonnées de risque
                AppName = riskAnalysis.AppName,
                AppVendor = riskAnalysis.AppVendor,
                RiskScore = riskAnalysis.RiskScore,
                Cve = riskAnalysis.Cve,
                OsVersion = _osVersion,
                OsBuild = _osBuild,
                InstalledSoftware = _softwareCache.ToArray(),
                PendingUpdates = _updatesCache.ToArray()
            };
        }

        static void StartInventoryLoop()
        {
            Task.Run(() =>
            {
                while (true)
                {
                    try
                    {
                        RefreshSoftwareInventory();
                        _updatesCache = CollectPendingUpdates();
                        File.AppendAllText(LOG_FILE,
                            $"[{DateTime.Now}] Inventaire: {_softwareCache.Count} logiciels, {_updatesCache.Count} patchs en attente, OS={_osVersion} ({_osBuild})\n");
                    }
                    catch (Exception ex)
                    {
                        File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Inventaire: {ex.Message}\n");
                    }
                    Thread.Sleep(TimeSpan.FromMinutes(15));
                }
            });
        }

        static void RefreshSoftwareInventory()
        {
            CollectOsInfo();
            _softwareCache = CollectInstalledSoftware();
        }

        static void CollectOsInfo()
        {
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT Caption, Version, BuildNumber FROM Win32_OperatingSystem");
                foreach (ManagementObject obj in searcher.Get())
                {
                    _osVersion = (obj["Caption"]?.ToString() ?? "").Trim();
                    _osBuild = (obj["BuildNumber"]?.ToString() ?? obj["Version"]?.ToString() ?? "").Trim();
                    break;
                }
            }
            catch
            {
                _osVersion = Environment.OSVersion.VersionString;
                _osBuild = Environment.OSVersion.Version.Build.ToString();
            }
        }

        static List<InstalledApp> CollectInstalledSoftware()
        {
            var map = new Dictionary<string, InstalledApp>(StringComparer.OrdinalIgnoreCase);
            ReadUninstallHive(RegistryHive.LocalMachine, RegistryView.Registry64, map);
            ReadUninstallHive(RegistryHive.LocalMachine, RegistryView.Registry32, map);
            ReadUninstallHive(RegistryHive.CurrentUser, RegistryView.Registry64, map);
            return map.Values
                .OrderBy(a => a.Name)
                .Take(250)
                .ToList();
        }

        static void ReadUninstallHive(RegistryHive hive, RegistryView view, Dictionary<string, InstalledApp> map)
        {
            try
            {
                using var baseKey = RegistryKey.OpenBaseKey(hive, view);
                ReadUninstallKey(baseKey, @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", map);
                ReadUninstallKey(baseKey, @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall", map);
            }
            catch { }
        }

        static void ReadUninstallKey(RegistryKey baseKey, string path, Dictionary<string, InstalledApp> map)
        {
            using var key = baseKey.OpenSubKey(path);
            if (key == null) return;

            foreach (string subName in key.GetSubKeyNames())
            {
                try
                {
                    using var sub = key.OpenSubKey(subName);
                    if (sub == null) continue;

                    object? systemComponent = sub.GetValue("SystemComponent");
                    if (systemComponent != null && Convert.ToInt32(systemComponent) == 1) continue;
                    if (sub.GetValue("ParentKeyName") != null) continue;

                    string name = (sub.GetValue("DisplayName") as string ?? "").Trim();
                    if (name.Length < 2) continue;
                    if (name.StartsWith("Security Update", StringComparison.OrdinalIgnoreCase)) continue;
                    if (name.StartsWith("Update for", StringComparison.OrdinalIgnoreCase)) continue;
                    if (name.StartsWith("Hotfix", StringComparison.OrdinalIgnoreCase)) continue;
                    if (Regex.IsMatch(name, @"^KB\d+", RegexOptions.IgnoreCase)) continue;

                    string version = (sub.GetValue("DisplayVersion") as string ?? "").Trim();
                    string publisher = (sub.GetValue("Publisher") as string ?? "").Trim();
                    string id = name.ToLowerInvariant();
                    if (!map.ContainsKey(id))
                    {
                        map[id] = new InstalledApp { Name = name, Version = version, Publisher = publisher };
                    }
                }
                catch { }
            }
        }

        static List<PendingUpdate> CollectPendingUpdates()
        {
            var list = new List<PendingUpdate>();
            try
            {
                Type? sessionType = Type.GetTypeFromProgID("Microsoft.Update.Session");
                if (sessionType == null) return list;

                object? session = Activator.CreateInstance(sessionType);
                if (session == null) return list;

                object? searcher = sessionType.InvokeMember(
                    "CreateUpdateSearcher", BindingFlags.InvokeMethod, null, session, null);
                if (searcher == null) return list;

                try
                {
                    searcher.GetType().InvokeMember("Online", BindingFlags.SetProperty, null, searcher, new object[] { false });
                }
                catch { }

                object? result = searcher.GetType().InvokeMember(
                    "Search", BindingFlags.InvokeMethod, null, searcher, new object[] { "IsInstalled=0 and IsHidden=0" });
                if (result == null) return list;

                object? updates = result.GetType().InvokeMember("Updates", BindingFlags.GetProperty, null, result, null);
                if (updates == null) return list;

                int count = Convert.ToInt32(updates.GetType().InvokeMember("Count", BindingFlags.GetProperty, null, updates, null));
                for (int i = 0; i < count && i < 40; i++)
                {
                    object? update = updates.GetType().InvokeMember("Item", BindingFlags.GetProperty, null, updates, new object[] { i });
                    if (update == null) continue;
                    string title = update.GetType().InvokeMember("Title", BindingFlags.GetProperty, null, update, null)?.ToString() ?? "";
                    if (string.IsNullOrWhiteSpace(title)) continue;

                    bool security = false;
                    try
                    {
                        object? cats = update.GetType().InvokeMember("Categories", BindingFlags.GetProperty, null, update, null);
                        if (cats != null)
                        {
                            int catCount = Convert.ToInt32(cats.GetType().InvokeMember("Count", BindingFlags.GetProperty, null, cats, null));
                            for (int c = 0; c < catCount; c++)
                            {
                                object? cat = cats.GetType().InvokeMember("Item", BindingFlags.GetProperty, null, cats, new object[] { c });
                                string catName = cat?.GetType().InvokeMember("Name", BindingFlags.GetProperty, null, cat, null)?.ToString() ?? "";
                                if (catName.IndexOf("Security", StringComparison.OrdinalIgnoreCase) >= 0)
                                    security = true;
                            }
                        }
                    }
                    catch { }

                    if (!security && Regex.IsMatch(title, @"Security|Critique|Critical|KB\d+", RegexOptions.IgnoreCase))
                        security = true;

                    Match kb = Regex.Match(title, @"KB\d+", RegexOptions.IgnoreCase);
                    list.Add(new PendingUpdate
                    {
                        Title = title,
                        Kb = kb.Success ? kb.Value.ToUpperInvariant() : "",
                        Security = security
                    });
                }
            }
            catch (Exception ex)
            {
                File.AppendAllText(LOG_FILE, $"[{DateTime.Now}] Windows Update COM: {ex.Message}\n");
            }
            return list;
        }

        static async Task RefreshPollInterval()
        {
            try
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(4);
                var cfg = await client.GetFromJsonAsync<AgentRuntimeConfig>($"{BASE_URL}/api/agent/runtime-config");
                if (cfg != null && cfg.HeartbeatSeconds >= 5 && cfg.HeartbeatSeconds <= 600)
                {
                    _pollMs = cfg.HeartbeatSeconds * 1000;
                }
            }
            catch { }
        }

        static async Task SendToApi(AgentData data)
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(20);
            client.DefaultRequestHeaders.Add("X-API-Key", API_KEY);
            await client.PostAsJsonAsync(API_URL, data);
        }
    }

    public class AgentRuntimeConfig
    {
        public int HeartbeatSeconds { get; set; }
    }

    public class TaskResponse
    {
        public string? Action { get; set; }
        public string? Message { get; set; }
        public Dictionary<string, object>? Details { get; set; }
    }

    public class CriticalLogAnalysis
    {
        public string AppName { get; set; } = string.Empty;
        public string AppVendor { get; set; } = string.Empty;
        public int RiskScore { get; set; } = 0;
        public string Cve { get; set; } = string.Empty;
    }

    public class AgentData
    {
        public string Ip { get; set; } = string.Empty;              // NOUVEAU : clé de liaison backend
        public string MachineName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string PcName { get; set; } = string.Empty;
        public string CpuUsage { get; set; } = string.Empty;
        public long RamUsedMB { get; set; }
        public long RamTotalMB { get; set; }
        public string Status { get; set; } = "online";
        public DiskInfo[] Disks { get; set; } = Array.Empty<DiskInfo>();
        public Incident[] Incidents { get; set; } = Array.Empty<Incident>();
        public DateTime Timestamp { get; set; }

        // Logs séparés
        public string SystemLogs { get; set; } = string.Empty;
        public string AppLogs { get; set; } = string.Empty;
        public string SecurityLogs { get; set; } = string.Empty;

        // Métadonnées de risque
        public string AppName { get; set; } = string.Empty;
        public string AppVendor { get; set; } = string.Empty;
        public int RiskScore { get; set; }
        public string Cve { get; set; } = string.Empty;
        public string OsVersion { get; set; } = string.Empty;
        public string OsBuild { get; set; } = string.Empty;
        public InstalledApp[] InstalledSoftware { get; set; } = Array.Empty<InstalledApp>();
        public PendingUpdate[] PendingUpdates { get; set; } = Array.Empty<PendingUpdate>();
    }

    public class InstalledApp
    {
        public string Name { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string Publisher { get; set; } = string.Empty;
    }

    public class PendingUpdate
    {
        public string Title { get; set; } = string.Empty;
        public string Kb { get; set; } = string.Empty;
        public bool Security { get; set; }
    }

    public class DiskInfo
    {
        public string Name { get; set; } = string.Empty;
        public int FreeGB { get; set; }
        public int TotalGB { get; set; }
    }

    public class Incident
    {
        public string Severity { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }
}