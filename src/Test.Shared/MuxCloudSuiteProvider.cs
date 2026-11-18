namespace Test.Shared
{
    using System.Collections.Generic;
    using Touchstone.Core;

    /// <summary>
    /// Supplies <see cref="MuxCloudSuites.All"/> to adapters that rebuild cases in the process that runs them.
    /// </summary>
    public sealed class MuxCloudSuiteProvider : ITestSuiteProvider
    {
        #region Public-Members

        /// <inheritdoc />
        public IReadOnlyList<TestSuiteDescriptor> Suites
        {
            get { return MuxCloudSuites.All; }
        }

        #endregion
    }
}
