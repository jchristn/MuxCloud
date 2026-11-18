namespace Test.Automated
{
    using System.Threading.Tasks;
    using global::Test.Shared;
    using Touchstone.Cli;

    /// <summary>
    /// Console runner for every shared suite. Exit codes: 0 pass, 1 fail, 2 canceled, 3 bad arguments.
    /// </summary>
    public static class Program
    {
        #region Public-Methods

        /// <summary>
        /// Run the suites.
        /// </summary>
        /// <param name="args">Touchstone console runner arguments.</param>
        /// <returns>Exit code.</returns>
        public static async Task<int> Main(string[] args)
        {
            return await ConsoleRunner.RunMainAsync(MuxCloudSuites.All, args).ConfigureAwait(false);
        }

        #endregion
    }
}
