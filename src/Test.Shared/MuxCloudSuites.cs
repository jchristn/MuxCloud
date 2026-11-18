namespace Test.Shared
{
    using System.Collections.Generic;
    using Test.Shared.Suites;
    using Touchstone.Core;

    /// <summary>
    /// Every shared suite, run by Test.Automated, Test.Xunit3, and Test.Nunit.
    /// </summary>
    public static class MuxCloudSuites
    {
        #region Public-Members

        /// <summary>
        /// All suites, in run order.
        /// </summary>
        public static IReadOnlyList<TestSuiteDescriptor> All
        {
            get
            {
                return new List<TestSuiteDescriptor>
                {
                    ProtocolSuites.Envelope(),
                    ProtocolSuites.Proof(),
                    ProtocolSuites.Policy(),
                    DatabaseSuites.Database(),
                    AccountSuites.Accounts(),
                    EmailSuites.Email(),
                    ServerSuites.Http(),
                    ServerSuites.Tunnel()
                };
            }
        }

        #endregion
    }
}
