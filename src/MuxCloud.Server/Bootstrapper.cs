namespace MuxCloud.Server
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Settings;
    using SyslogLogging;

    /// <summary>
    /// Composition root: load settings, configure logging, start the server, and drain it on Ctrl+C or SIGTERM.
    /// </summary>
    public static class Bootstrapper
    {
        #region Public-Methods

        /// <summary>
        /// Run until stopped.
        /// </summary>
        /// <param name="args">Arguments: --config path (or MUXCLOUD_SETTINGS_FILE).</param>
        /// <returns>Exit code: 0 after a clean stop, 1 on startup failure.</returns>
        public static async Task<int> RunAsync(string[] args)
        {
            string? path = null;
            for (int i = 0; i < args.Length; i++)
            {
                if ((args[i] == "--config" || args[i] == "-c") && i + 1 < args.Length) path = args[++i];
            }

            MuxCloudSettings settings;
            try
            {
                settings = SettingsLoader.Load(SettingsLoader.ResolvePath(path));
            }
            catch (Exception e) when (e is IOException || e is InvalidDataException || e is UnauthorizedAccessException)
            {
                Console.Error.WriteLine("Mux Cloud could not load its settings: " + e.Message);
                return 1;
            }

            LoggingModule logging = CreateLogging(settings.Logging);
            using (MuxCloudServer server = new MuxCloudServer(settings))
            {
                server.Logger = (string line) => logging.Info("[MuxCloud] " + line);
                server.ErrorLogger = (string line) => logging.Warn("[MuxCloud] " + line);
                using (CancellationTokenSource stop = new CancellationTokenSource())
                {
                    Console.CancelKeyPress += (object? sender, ConsoleCancelEventArgs e) =>
                    {
                        e.Cancel = true;
                        stop.Cancel();
                    };
                    AppDomain.CurrentDomain.ProcessExit += (object? sender, EventArgs e) => stop.Cancel();
                    try
                    {
                        await server.StartAsync(stop.Token).ConfigureAwait(false);
                    }
                    catch (Exception e)
                    {
                        logging.Alert("[MuxCloud] startup failed: " + e.Message);
                        return 1;
                    }

                    try
                    {
                        await Task.Delay(Timeout.Infinite, stop.Token).ConfigureAwait(false);
                    }
                    catch (OperationCanceledException)
                    {
                    }

                    logging.Info("[MuxCloud] stopping; draining tunnels");
                    await server.StopAsync().ConfigureAwait(false);
                }
            }

            return 0;
        }

        #endregion

        #region Private-Methods

        private static LoggingModule CreateLogging(MuxCloud.Core.Settings.LoggingSettings settings)
        {
            List<SyslogServer> servers = new List<SyslogServer>();
            foreach (SyslogServerSettings s in settings.SyslogServers) servers.Add(new SyslogServer(s.Hostname, s.Port));
            LoggingModule logging = servers.Count > 0 ? new LoggingModule(servers) : new LoggingModule();
            logging.Settings.MinimumSeverity = (Severity)settings.MinimumSeverity;
            logging.Settings.EnableConsole = settings.ConsoleLogging;
            if (settings.FileLogging)
            {
                Directory.CreateDirectory(settings.LogDirectory);
                logging.Settings.LogFilename = Path.Combine(settings.LogDirectory, settings.LogFilename);
                logging.Settings.FileLogging = FileLoggingMode.FileWithDate;
            }

            return logging;
        }

        #endregion
    }
}
