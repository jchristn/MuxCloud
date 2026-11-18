namespace Test.Shared
{
    using System;
    using System.Threading.Tasks;

    /// <summary>
    /// Assertion helpers for shared suites. Every failure throws <see cref="TestAssertionException"/>.
    /// </summary>
    public static class TestAssert
    {
        #region Public-Methods

        /// <summary>
        /// Require a condition.
        /// </summary>
        /// <param name="condition">Condition.</param>
        /// <param name="message">Failure message.</param>
        /// <exception cref="TestAssertionException">The condition is false.</exception>
        public static void True(bool condition, string message)
        {
            if (!condition) throw new TestAssertionException(message);
        }

        /// <summary>
        /// Require equality.
        /// </summary>
        /// <typeparam name="T">Value type.</typeparam>
        /// <param name="expected">Expected.</param>
        /// <param name="actual">Actual.</param>
        /// <param name="what">What is compared.</param>
        /// <exception cref="TestAssertionException">The values differ.</exception>
        public static void Equal<T>(T expected, T actual, string what)
        {
            if (!Object.Equals(expected, actual)) throw new TestAssertionException(what + ": expected '" + expected + "', got '" + actual + "'.");
        }

        /// <summary>
        /// Require that an action throws a specific exception type.
        /// </summary>
        /// <typeparam name="TException">Expected exception type.</typeparam>
        /// <param name="action">Action.</param>
        /// <param name="what">What is being checked.</param>
        /// <exception cref="TestAssertionException">Nothing or something else was thrown.</exception>
        public static void Throws<TException>(Action action, string what) where TException : Exception
        {
            ArgumentNullException.ThrowIfNull(action);
            try
            {
                action();
            }
            catch (TException)
            {
                return;
            }
            catch (Exception e)
            {
                throw new TestAssertionException(what + ": expected " + typeof(TException).Name + ", got " + e.GetType().Name + " (" + e.Message + ").");
            }

            throw new TestAssertionException(what + ": expected " + typeof(TException).Name + ", nothing was thrown.");
        }

        /// <summary>
        /// Require that an async action throws a specific exception type.
        /// </summary>
        /// <typeparam name="TException">Expected exception type.</typeparam>
        /// <param name="action">Action.</param>
        /// <param name="what">What is being checked.</param>
        /// <returns>Task.</returns>
        /// <exception cref="TestAssertionException">Nothing or something else was thrown.</exception>
        public static async Task ThrowsAsync<TException>(Func<Task> action, string what) where TException : Exception
        {
            ArgumentNullException.ThrowIfNull(action);
            try
            {
                await action().ConfigureAwait(false);
            }
            catch (TException)
            {
                return;
            }
            catch (Exception e)
            {
                throw new TestAssertionException(what + ": expected " + typeof(TException).Name + ", got " + e.GetType().Name + " (" + e.Message + ").");
            }

            throw new TestAssertionException(what + ": expected " + typeof(TException).Name + ", nothing was thrown.");
        }

        #endregion
    }
}
