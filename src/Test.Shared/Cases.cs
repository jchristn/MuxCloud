namespace Test.Shared
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using Touchstone.Core;

    /// <summary>
    /// Factories for test case descriptors.
    /// </summary>
    public static class Cases
    {
        #region Public-Methods

        /// <summary>
        /// A synchronous case.
        /// </summary>
        /// <param name="suite">Suite identifier.</param>
        /// <param name="id">Case identifier.</param>
        /// <param name="name">Display name.</param>
        /// <param name="body">Body.</param>
        /// <returns>Descriptor.</returns>
        public static TestCaseDescriptor Sync(string suite, string id, string name, Action body)
        {
            ArgumentNullException.ThrowIfNull(body);
            return new TestCaseDescriptor(suite, id, name, (CancellationToken token) =>
            {
                body();
                return Task.CompletedTask;
            });
        }

        /// <summary>
        /// An asynchronous case.
        /// </summary>
        /// <param name="suite">Suite identifier.</param>
        /// <param name="id">Case identifier.</param>
        /// <param name="name">Display name.</param>
        /// <param name="body">Body receiving the run's cancellation token.</param>
        /// <returns>Descriptor.</returns>
        public static TestCaseDescriptor Async(string suite, string id, string name, Func<CancellationToken, Task> body)
        {
            ArgumentNullException.ThrowIfNull(body);
            return new TestCaseDescriptor(suite, id, name, body);
        }

        #endregion
    }
}
