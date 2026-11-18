namespace MuxCloud.Core.Exceptions
{
    using System;

    /// <summary>
    /// A request failed in a way the API reports to the caller: an HTTP status, a stable error code, and a message.
    /// </summary>
    public class ApiException : Exception
    {
        #region Public-Members

        /// <summary>
        /// HTTP status code. Minimum 400, maximum 599.
        /// </summary>
        public int StatusCode { get; }

        /// <summary>
        /// Stable error code, for example InvalidCredentials.
        /// </summary>
        public string ErrorCode { get; }

        /// <summary>
        /// Seconds the caller should wait before retrying, or null.
        /// </summary>
        public int? RetryAfterSeconds { get; init; } = null;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="statusCode">HTTP status code.</param>
        /// <param name="errorCode">Stable error code.</param>
        /// <param name="message">Message with context.</param>
        public ApiException(int statusCode, string errorCode, string message) : base(message)
        {
            StatusCode = Math.Clamp(statusCode, 400, 599);
            ErrorCode = String.IsNullOrWhiteSpace(errorCode) ? "InternalServerError" : errorCode;
        }

        /// <summary>
        /// 400 BadRequest.
        /// </summary>
        /// <param name="message">What was invalid.</param>
        /// <returns>Exception.</returns>
        public static ApiException BadRequest(string message)
        {
            return new ApiException(400, "BadRequest", message);
        }

        /// <summary>
        /// 401 Unauthorized.
        /// </summary>
        /// <param name="message">Message.</param>
        /// <returns>Exception.</returns>
        public static ApiException Unauthorized(string message = "Authentication is required.")
        {
            return new ApiException(401, "Unauthorized", message);
        }

        /// <summary>
        /// 401 InvalidCredentials.
        /// </summary>
        /// <returns>Exception.</returns>
        public static ApiException InvalidCredentials()
        {
            return new ApiException(401, "InvalidCredentials", "The email or password is incorrect.");
        }

        /// <summary>
        /// 401 or 400 InvalidToken.
        /// </summary>
        /// <param name="statusCode">Status code (400 for one-time tokens, 401 for refresh tokens).</param>
        /// <param name="message">Message.</param>
        /// <returns>Exception.</returns>
        public static ApiException InvalidToken(int statusCode, string message)
        {
            return new ApiException(statusCode, "InvalidToken", message);
        }

        /// <summary>
        /// 403 Forbidden.
        /// </summary>
        /// <param name="message">Message.</param>
        /// <returns>Exception.</returns>
        public static ApiException Forbidden(string message = "You do not have access to this resource.")
        {
            return new ApiException(403, "Forbidden", message);
        }

        /// <summary>
        /// 404 NotFound.
        /// </summary>
        /// <param name="what">What was not found.</param>
        /// <returns>Exception.</returns>
        public static ApiException NotFound(string what)
        {
            return new ApiException(404, "NotFound", what + " was not found.");
        }

        /// <summary>
        /// 409 Conflict.
        /// </summary>
        /// <param name="code">Error code.</param>
        /// <param name="message">Message.</param>
        /// <returns>Exception.</returns>
        public static ApiException Conflict(string code, string message)
        {
            return new ApiException(409, code, message);
        }

        /// <summary>
        /// 429 TooManyAttempts.
        /// </summary>
        /// <param name="retryAfterSeconds">Seconds before retrying.</param>
        /// <returns>Exception.</returns>
        public static ApiException TooManyAttempts(int retryAfterSeconds)
        {
            return new ApiException(429, "TooManyAttempts", "Too many attempts. Try again in " + Math.Max(1, retryAfterSeconds) + " seconds.") { RetryAfterSeconds = Math.Max(1, retryAfterSeconds) };
        }

        #endregion
    }
}
