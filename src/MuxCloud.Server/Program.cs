namespace MuxCloud.Server
{
    using System.Threading.Tasks;

    /// <summary>
    /// Entry point.
    /// </summary>
    public static class Program
    {
        #region Public-Methods

        /// <summary>
        /// Run the server.
        /// </summary>
        /// <param name="args">Arguments.</param>
        /// <returns>Exit code.</returns>
        public static Task<int> Main(string[] args)
        {
            return Bootstrapper.RunAsync(args);
        }

        #endregion
    }
}
