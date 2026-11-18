namespace MuxCloud.Core.Enums
{
    /// <summary>
    /// What a one-time token is for.
    /// </summary>
    public enum OneTimeTokenPurposeEnum
    {
        /// <summary>
        /// Confirm an email address.
        /// </summary>
        EmailVerification = 0,

        /// <summary>
        /// Reset a password.
        /// </summary>
        PasswordReset = 1
    }
}
