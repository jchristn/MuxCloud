namespace MuxCloud.Email.Templates
{
    using System;

    /// <summary>
    /// One message type. A template composes an <see cref="EmailDocument"/>; the layout renders it.
    /// </summary>
    public abstract class EmailTemplate
    {
        #region Public-Members

        /// <summary>
        /// Stable template key, for example verify_email.
        /// </summary>
        public abstract string Key { get; }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Compose the message.
        /// </summary>
        /// <returns>Document.</returns>
        public abstract EmailDocument Compose();

        #endregion

        #region Private-Methods

        /// <summary>
        /// Greeting line for a first name, or a neutral one.
        /// </summary>
        /// <param name="firstName">First name.</param>
        /// <returns>Greeting.</returns>
        protected static string Greeting(string? firstName)
        {
            return String.IsNullOrWhiteSpace(firstName) ? "Hi," : "Hi " + firstName.Trim() + ",";
        }

        #endregion
    }
}
