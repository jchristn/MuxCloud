namespace Test.Shared
{
    using System;

    /// <summary>
    /// A shared test assertion failed.
    /// </summary>
    public class TestAssertionException : Exception
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="message">What was expected and what happened.</param>
        public TestAssertionException(string message) : base(message)
        {
        }

        #endregion
    }
}
