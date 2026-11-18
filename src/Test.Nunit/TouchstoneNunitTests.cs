// Shared suites host real servers on free ports; run them one at a time.
[assembly: NUnit.Framework.NonParallelizable]
[assembly: NUnit.Framework.LevelOfParallelism(1)]

namespace Test.Nunit
{
    using System.Collections;
    using System.Threading.Tasks;
    using global::Test.Shared;
    using NUnit.Framework;
    using Touchstone.Core;
    using Touchstone.NunitAdapter;

    /// <summary>
    /// NUnit runner for every shared suite.
    /// </summary>
    [TestFixture]
    public sealed class TouchstoneNunitTests
    {
        #region Public-Methods

        /// <summary>
        /// Shared cases.
        /// </summary>
        /// <returns>Cases.</returns>
        public static IEnumerable TestCases()
        {
            return TouchstoneNunitCases.From(MuxCloudSuites.All);
        }

        /// <summary>
        /// Run one shared case.
        /// </summary>
        /// <param name="testCase">Case.</param>
        /// <returns>Task.</returns>
        [Test]
        [TestCaseSource(nameof(TestCases))]
        public async Task RunTest(TestCaseDescriptor testCase)
        {
            await TouchstoneNunit.ExecuteAsync(testCase, null, null, TestContext.CurrentContext.CancellationToken).ConfigureAwait(false);
        }

        #endregion
    }
}
