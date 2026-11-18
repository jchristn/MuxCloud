namespace Test.Xunit3
{
    using System.Threading.Tasks;
    using global::Test.Shared;
    using Touchstone.Xunit3Adapter;
    using Xunit;

    /// <summary>
    /// xUnit v3 runner for every shared suite.
    /// </summary>
    public sealed class TouchstoneXunit3Tests
    {
        #region Public-Methods

        /// <summary>
        /// Shared cases as theory rows.
        /// </summary>
        /// <returns>Cases.</returns>
        public static TheoryData<TouchstoneXunit3Case> Cases()
        {
            return TouchstoneXunit3Cases.From<MuxCloudSuiteProvider>();
        }

        /// <summary>
        /// Run one shared case.
        /// </summary>
        /// <param name="testCase">Case.</param>
        /// <returns>Task.</returns>
        [Theory]
        [MemberData(nameof(Cases))]
        public Task Run(TouchstoneXunit3Case testCase)
        {
            return TouchstoneXunit3.ExecuteAsync(testCase, TestContext.Current.CancellationToken);
        }

        #endregion
    }
}
