namespace Test.Automated
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using global::Test.Shared;
    using MuxCloud.Core.Database;
    using Touchstone.Cli;

    /// <summary>
    /// Console runner for every shared suite. Exit codes: 0 pass, 1 fail, 2 canceled, 3 bad arguments.
    /// --provider Sqlite|Mysql|Postgresql|SqlServer selects the database engine; it is removed before the remaining
    /// arguments reach the Touchstone runner. An unknown or missing value exits 3.
    /// </summary>
    public static class Program
    {
        #region Public-Methods

        /// <summary>
        /// Run the suites.
        /// </summary>
        /// <param name="args">Arguments.</param>
        /// <returns>Exit code.</returns>
        public static async Task<int> Main(string[] args)
        {
            List<string> remaining = new List<string>();
            for (int i = 0; i < args.Length; i++)
            {
                if (String.Equals(args[i], "--provider", StringComparison.OrdinalIgnoreCase))
                {
                    if (i + 1 >= args.Length || !TestDatabase.TryParse(args[i + 1], out DatabaseTypeEnum provider))
                    {
                        Console.Error.WriteLine("--provider requires one of Sqlite, Mysql, Postgresql, SqlServer.");
                        return 3;
                    }

                    TestDatabase.Configure(provider);
                    i++;
                    continue;
                }

                remaining.Add(args[i]);
            }

            Console.WriteLine("Database provider: " + TestDatabase.Provider);
            try
            {
                return await ConsoleRunner.RunMainAsync(MuxCloudSuites.All, remaining.ToArray()).ConfigureAwait(false);
            }
            finally
            {
                await TestDatabase.DropAllAsync().ConfigureAwait(false);
            }
        }

        #endregion
    }
}
