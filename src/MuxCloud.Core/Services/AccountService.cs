namespace MuxCloud.Core.Services
{
    using System;
    using System.Collections.Generic;
    using System.Net.Mail;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Enums;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Security;
    using MuxCloud.Core.Services.Interfaces;
    using MuxCloud.Core.Settings;

    /// <summary>
    /// Accounts, sign in, sessions, and passwords. Each signup gets a personal account and tenant; email is unique across the
    /// service and login needs only email and password (recorded departures from AUTHENTICATION.md).
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class AccountService
    {
        #region Public-Members

        /// <summary>
        /// Raised when a user's sessions and machines must be disconnected (user disabled or deleted). The argument is the user.
        /// </summary>
        public event EventHandler<User>? UserDisconnected;

        #endregion

        #region Private-Members

        private readonly DatabaseDriverBase _Db;
        private readonly MuxCloudSettings _Settings;
        private readonly PasswordHasher _Hasher;
        private readonly TokenProtector _Protector;
        private readonly IAccountNotifier _Notifier;
        private readonly AuditService _Audit;
        private readonly AttemptLimiter _LoginLimiter;
        private readonly AttemptLimiter _AnonymousLimiter;
        private static readonly TimeSpan _VerificationLifetime = TimeSpan.FromHours(48);
        private static readonly TimeSpan _ResetLifetime = TimeSpan.FromHours(1);
        private static readonly TimeSpan _TouchInterval = TimeSpan.FromMinutes(1);

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Database.</param>
        /// <param name="settings">Settings.</param>
        /// <param name="protector">Token protector.</param>
        /// <param name="notifier">Notifier.</param>
        /// <param name="audit">Audit service.</param>
        /// <exception cref="ArgumentNullException">An argument is null.</exception>
        public AccountService(DatabaseDriverBase db, MuxCloudSettings settings, TokenProtector protector, IAccountNotifier notifier, AuditService audit)
        {
            ArgumentNullException.ThrowIfNull(db);
            ArgumentNullException.ThrowIfNull(settings);
            ArgumentNullException.ThrowIfNull(protector);
            ArgumentNullException.ThrowIfNull(notifier);
            ArgumentNullException.ThrowIfNull(audit);
            _Db = db;
            _Settings = settings;
            _Protector = protector;
            _Notifier = notifier;
            _Audit = audit;
            _Hasher = new PasswordHasher { Iterations = settings.Auth.PasswordIterations };
            _LoginLimiter = new AttemptLimiter(settings.Auth.MaxLoginFailures, TimeSpan.FromSeconds(settings.Auth.LoginFailureWindowSeconds), TimeSpan.FromSeconds(settings.Auth.LockoutSeconds));
            _AnonymousLimiter = new AttemptLimiter(settings.Auth.AnonymousRequestsPerHour, TimeSpan.FromHours(1), TimeSpan.FromHours(1));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Normalize an email for lookup: trimmed and lower case.
        /// </summary>
        /// <param name="email">Email.</param>
        /// <returns>Normalized email.</returns>
        public static string NormalizeEmail(string? email)
        {
            return (email ?? String.Empty).Trim().ToLowerInvariant();
        }

        /// <summary>
        /// Create a user with a personal account and tenant, subscribe it to the free plan, and send the verification email.
        /// </summary>
        /// <param name="request">Signup request.</param>
        /// <param name="sourceIp">Requester IP.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>New user.</returns>
        /// <exception cref="ApiException">400 for invalid input, 409 EmailInUse, 429 when rate limited.</exception>
        public async Task<User> SignupAsync(SignupRequest request, string sourceIp, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            ConsumeAnonymous(sourceIp);
            string email = (request.Email ?? String.Empty).Trim();
            ValidateEmail(email);
            ValidatePassword(request.Password);
            if (!request.AcceptTerms) throw ApiException.BadRequest("acceptTerms must be true.");
            string first = Limit(request.FirstName, 100, "firstName");
            string last = Limit(request.LastName, 100, "lastName");
            string normalized = NormalizeEmail(email);
            if (await _Db.Users.ReadByEmailAsync(normalized, token).ConfigureAwait(false) != null) throw ApiException.Conflict("EmailInUse", "An account with this email already exists.");

            DateTime now = DateTime.UtcNow;
            Account account = new Account { Name = email };
            Tenant tenant = new Tenant { AccountId = account.Id, Name = email };
            _Hasher.Hash(request.Password!, out string hash, out string salt);
            User user = new User
            {
                TenantId = tenant.Id,
                AccountId = account.Id,
                Email = email,
                EmailNormalized = normalized,
                FirstName = first,
                LastName = last,
                PasswordHash = hash,
                PasswordSalt = salt,
                PasswordAlgorithm = Constants.PasswordAlgorithm,
                PasswordIterations = _Hasher.Iterations,
                TermsVersion = _Settings.Auth.TermsVersion,
                TermsAcceptedUtc = now,
                IsTenantAdmin = true,
                EmailVerifiedUtc = _Settings.Auth.RequireEmailVerification ? null : now
            };
            account.OwnerUserId = user.Id;
            await _Db.Accounts.CreateAsync(account, token).ConfigureAwait(false);
            await _Db.Tenants.CreateAsync(tenant, token).ConfigureAwait(false);
            try
            {
                await _Db.Users.CreateAsync(user, token).ConfigureAwait(false);
            }
            catch (Exception) when (!token.IsCancellationRequested)
            {
                await _Db.Tenants.DeleteAsync(tenant.Id, token).ConfigureAwait(false);
                await _Db.Accounts.DeleteAsync(account.Id, token).ConfigureAwait(false);
                if (await _Db.Users.ReadByEmailAsync(normalized, token).ConfigureAwait(false) != null) throw ApiException.Conflict("EmailInUse", "An account with this email already exists.");
                throw;
            }

            Plan? free = await _Db.Plans.ReadByCodeAsync(Constants.FreePlanCode, token).ConfigureAwait(false);
            if (free != null)
            {
                await _Db.Subscriptions.CreateAsync(new Subscription { AccountId = account.Id, TenantId = tenant.Id, PlanId = free.Id, Status = SubscriptionStatusEnum.Active }, token).ConfigureAwait(false);
            }

            await _Audit.WriteAsync("auth.signup", "success", tenant.Id, user.Id, "user", user.Id, sourceIp, null, token).ConfigureAwait(false);
            if (_Settings.Auth.RequireEmailVerification)
            {
                string value = await CreateOneTimeTokenAsync(user, OneTimeTokenPurposeEnum.EmailVerification, _VerificationLifetime, token).ConfigureAwait(false);
                await _Notifier.SendVerificationAsync(user, _Settings.Server.PublicUrl + "/verify?token=" + Uri.EscapeDataString(value), token).ConfigureAwait(false);
            }
            else
            {
                await _Notifier.SendWelcomeAsync(user, token).ConfigureAwait(false);
            }

            return user;
        }

        /// <summary>
        /// Confirm an email address.
        /// </summary>
        /// <param name="value">Token value from the email.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Verified user.</returns>
        /// <exception cref="ApiException">400 InvalidToken.</exception>
        public async Task<User> VerifyEmailAsync(string? value, CancellationToken token = default)
        {
            OneTimeToken record = await ConsumeOneTimeTokenAsync(value, OneTimeTokenPurposeEnum.EmailVerification, token).ConfigureAwait(false);
            User user = await _Db.Users.ReadAsync(record.TenantId, record.UserId, token).ConfigureAwait(false) ?? throw ApiException.InvalidToken(400, "The verification link is invalid or has expired.");
            bool first = user.EmailVerifiedUtc == null;
            if (first)
            {
                user.EmailVerifiedUtc = DateTime.UtcNow;
                await _Db.Users.UpdateAsync(user, token).ConfigureAwait(false);
                await _Notifier.SendWelcomeAsync(user, token).ConfigureAwait(false);
            }

            await _Audit.WriteAsync("auth.verify", "success", user.TenantId, user.Id, "user", user.Id, null, null, token).ConfigureAwait(false);
            return user;
        }

        /// <summary>
        /// Send a new verification email to an unverified user. Reveals nothing about whether the address exists.
        /// </summary>
        /// <param name="email">Email.</param>
        /// <param name="sourceIp">Requester IP.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">429 when rate limited.</exception>
        public async Task ResendVerificationAsync(string? email, string sourceIp, CancellationToken token = default)
        {
            ConsumeAnonymous(sourceIp);
            User? user = await _Db.Users.ReadByEmailAsync(NormalizeEmail(email), token).ConfigureAwait(false);
            if (user == null || user.EmailVerifiedUtc != null || !user.Active) return;
            string value = await CreateOneTimeTokenAsync(user, OneTimeTokenPurposeEnum.EmailVerification, _VerificationLifetime, token).ConfigureAwait(false);
            await _Notifier.SendVerificationAsync(user, _Settings.Server.PublicUrl + "/verify?token=" + Uri.EscapeDataString(value), token).ConfigureAwait(false);
        }

        /// <summary>
        /// Check an email and password, applying lockout. Used by login and machine enrollment.
        /// </summary>
        /// <param name="email">Email.</param>
        /// <param name="password">Password.</param>
        /// <param name="sourceIp">Requester IP.</param>
        /// <param name="eventType">Audit event type.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>User.</returns>
        /// <exception cref="ApiException">400, 401 InvalidCredentials, 403 AccountDisabled or EmailNotVerified, 429 TooManyAttempts.</exception>
        public async Task<User> AuthenticateCredentialsAsync(string? email, string? password, string sourceIp, string eventType, CancellationToken token = default)
        {
            string normalized = NormalizeEmail(email);
            if (normalized.Length == 0 || String.IsNullOrEmpty(password)) throw ApiException.BadRequest("email and password are required.");
            string emailKey = "email:" + normalized;
            if (_LoginLimiter.IsLocked(emailKey, out int retry)) throw ApiException.TooManyAttempts(retry);
            User? user = await _Db.Users.ReadByEmailAsync(normalized, token).ConfigureAwait(false);
            if (user == null || !PasswordHasher.Verify(password, user.PasswordHash, user.PasswordSalt, user.PasswordIterations))
            {
                _LoginLimiter.RecordFailure(emailKey);
                await _Audit.WriteAsync(eventType, "failure", user?.TenantId, user?.Id, "user", user?.Id, sourceIp, "invalid credentials", token).ConfigureAwait(false);
                throw ApiException.InvalidCredentials();
            }

            _LoginLimiter.Reset(emailKey);
            if (!user.Active) throw new ApiException(403, "AccountDisabled", "This account is disabled.");
            if (_Settings.Auth.RequireEmailVerification && user.EmailVerifiedUtc == null) throw new ApiException(403, "EmailNotVerified", "Verify your email address before signing in.");
            if (user.PasswordIterations != _Hasher.Iterations || user.PasswordAlgorithm != Constants.PasswordAlgorithm)
            {
                _Hasher.Hash(password!, out string hash, out string salt);
                user.PasswordHash = hash;
                user.PasswordSalt = salt;
                user.PasswordIterations = _Hasher.Iterations;
                user.PasswordAlgorithm = Constants.PasswordAlgorithm;
                await _Db.Users.UpdateAsync(user, token).ConfigureAwait(false);
            }

            return user;
        }

        /// <summary>
        /// Sign in and create a session.
        /// </summary>
        /// <param name="request">Login request.</param>
        /// <param name="sourceIp">Requester IP.</param>
        /// <param name="userAgent">Requester user agent.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Tokens and session.</returns>
        /// <exception cref="ApiException">See <see cref="AuthenticateCredentialsAsync"/>.</exception>
        public async Task<LoginResult> LoginAsync(LoginRequest request, string sourceIp, string userAgent, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            User user = await AuthenticateCredentialsAsync(request.Email, request.Password, sourceIp, "auth.login", token).ConfigureAwait(false);
            user.LastLoginUtc = DateTime.UtcNow;
            await _Db.Users.UpdateAsync(user, token).ConfigureAwait(false);
            string client = String.Equals(request.Client, "mobile", StringComparison.OrdinalIgnoreCase) ? "mobile" : "web";
            LoginResult result = await IssueSessionAsync(user, client, Limit(request.DeviceName, 100, "deviceName"), sourceIp, userAgent, token).ConfigureAwait(false);
            await _Audit.WriteAsync("auth.login", "success", user.TenantId, user.Id, "session", result.Session.Id, sourceIp, client, token).ConfigureAwait(false);
            return result;
        }

        /// <summary>
        /// Rotate a refresh token. Presenting an already-used refresh token revokes its session.
        /// </summary>
        /// <param name="refreshToken">Refresh token.</param>
        /// <param name="sourceIp">Requester IP.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>New tokens.</returns>
        /// <exception cref="ApiException">401 InvalidToken.</exception>
        public async Task<LoginResult> RefreshAsync(string? refreshToken, string sourceIp, CancellationToken token = default)
        {
            if (String.IsNullOrWhiteSpace(refreshToken)) throw ApiException.InvalidToken(401, "A refresh token is required.");
            string hash = SecretHash.Sha256Hex(refreshToken);
            DateTime now = DateTime.UtcNow;
            AuthSession? session = await _Db.Sessions.ReadByRefreshHashAsync(hash, token).ConfigureAwait(false);
            if (session == null)
            {
                AuthSession? reused = await _Db.Sessions.ReadByPreviousRefreshHashAsync(hash, token).ConfigureAwait(false);
                if (reused != null && reused.RevokedUtc == null)
                {
                    reused.RevokedUtc = now;
                    reused.RevocationReason = "refresh token reuse";
                    await _Db.Sessions.UpdateAsync(reused, token).ConfigureAwait(false);
                    await _Audit.WriteAsync("auth.refresh", "denied", reused.TenantId, reused.UserId, "session", reused.Id, sourceIp, "refresh token reuse; session revoked", token).ConfigureAwait(false);
                }

                throw ApiException.InvalidToken(401, "The refresh token is invalid.");
            }

            if (session.RevokedUtc != null || session.RefreshExpiresUtc <= now) throw ApiException.InvalidToken(401, "The session has ended. Sign in again.");
            User? user = await _Db.Users.ReadAsync(session.TenantId, session.UserId, token).ConfigureAwait(false);
            if (user == null || !user.Active) throw ApiException.InvalidToken(401, "The session has ended. Sign in again.");
            string newRefresh = SecretHash.CreateToken(Constants.RefreshTokenPrefix);
            session.PreviousRefreshTokenHash = session.RefreshTokenHash;
            session.RefreshTokenHash = SecretHash.Sha256Hex(newRefresh);
            session.RefreshExpiresUtc = now.AddDays(_Settings.Auth.RefreshTokenDays);
            session.LastUsedUtc = now;
            await _Db.Sessions.UpdateAsync(session, token).ConfigureAwait(false);
            return BuildResult(user, session, newRefresh);
        }

        /// <summary>
        /// Validate an access token.
        /// </summary>
        /// <param name="accessToken">Access token.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Principal, or null when the token is invalid, expired, or its session or user is no longer active.</returns>
        public async Task<AuthenticatedPrincipal?> ValidateAccessTokenAsync(string? accessToken, CancellationToken token = default)
        {
            AccessTokenPayload? payload = _Protector.UnprotectAccessToken(accessToken);
            DateTime now = DateTime.UtcNow;
            if (payload == null || payload.ExpiresUtc <= now) return null;
            AuthSession? session = await _Db.Sessions.ReadAsync(payload.SessionId, token).ConfigureAwait(false);
            if (session == null || session.RevokedUtc != null || session.UserId != payload.UserId) return null;
            User? user = await _Db.Users.ReadAsync(payload.TenantId, payload.UserId, token).ConfigureAwait(false);
            if (user == null || !user.Active) return null;
            if (now - session.LastUsedUtc > _TouchInterval)
            {
                session.LastUsedUtc = now;
                await _Db.Sessions.TouchAsync(session.Id, now, token).ConfigureAwait(false);
            }

            return new AuthenticatedPrincipal { User = user, Session = session };
        }

        /// <summary>
        /// Re-validate a session by identifier (WebSocket tickets).
        /// </summary>
        /// <param name="tenantId">Tenant.</param>
        /// <param name="userId">User.</param>
        /// <param name="sessionId">Session.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Principal, or null when the session or user is no longer active.</returns>
        public async Task<AuthenticatedPrincipal?> ValidateSessionAsync(string tenantId, string userId, string sessionId, CancellationToken token = default)
        {
            AuthSession? session = await _Db.Sessions.ReadAsync(sessionId, token).ConfigureAwait(false);
            if (session == null || session.RevokedUtc != null || session.UserId != userId || session.RefreshExpiresUtc <= DateTime.UtcNow) return null;
            User? user = await _Db.Users.ReadAsync(tenantId, userId, token).ConfigureAwait(false);
            if (user == null || !user.Active) return null;
            return new AuthenticatedPrincipal { User = user, Session = session };
        }

        /// <summary>
        /// Revoke a session.
        /// </summary>
        /// <param name="session">Session.</param>
        /// <param name="reason">Reason.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ArgumentNullException">session is null.</exception>
        public async Task RevokeSessionAsync(AuthSession session, string reason, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(session);
            if (session.RevokedUtc != null) return;
            session.RevokedUtc = DateTime.UtcNow;
            session.RevocationReason = reason ?? String.Empty;
            await _Db.Sessions.UpdateAsync(session, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Revoke one of a user's sessions by identifier.
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="sessionId">Session.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">404 when the session is not the user's.</exception>
        public async Task RevokeSessionAsync(User user, string sessionId, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            AuthSession? session = await _Db.Sessions.ReadAsync(sessionId, token).ConfigureAwait(false);
            if (session == null || session.UserId != user.Id || session.TenantId != user.TenantId) throw ApiException.NotFound("Session");
            await RevokeSessionAsync(session, "revoked by user", token).ConfigureAwait(false);
        }

        /// <summary>
        /// A user's active sessions.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="page">Paging.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Page of sessions.</returns>
        public Task<PagedResult<AuthSession>> ListSessionsAsync(User user, PageRequest page, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            return _Db.Sessions.EnumerateActiveAsync(user.TenantId, user.Id, DateTime.UtcNow, page, token);
        }

        /// <summary>
        /// Email a password reset link. Reveals nothing about whether the address exists.
        /// </summary>
        /// <param name="email">Email.</param>
        /// <param name="sourceIp">Requester IP.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">429 when rate limited.</exception>
        public async Task ForgotPasswordAsync(string? email, string sourceIp, CancellationToken token = default)
        {
            ConsumeAnonymous(sourceIp);
            User? user = await _Db.Users.ReadByEmailAsync(NormalizeEmail(email), token).ConfigureAwait(false);
            if (user == null || !user.Active) return;
            string value = await CreateOneTimeTokenAsync(user, OneTimeTokenPurposeEnum.PasswordReset, _ResetLifetime, token).ConfigureAwait(false);
            await _Notifier.SendPasswordResetAsync(user, _Settings.Server.PublicUrl + "/reset?token=" + Uri.EscapeDataString(value), token).ConfigureAwait(false);
            await _Audit.WriteAsync("auth.password.forgot", "success", user.TenantId, user.Id, "user", user.Id, sourceIp, null, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Set a new password with a reset token. Revokes every session.
        /// </summary>
        /// <param name="value">Reset token.</param>
        /// <param name="password">New password.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>User.</returns>
        /// <exception cref="ApiException">400 InvalidToken or BadRequest.</exception>
        public async Task<User> ResetPasswordAsync(string? value, string? password, CancellationToken token = default)
        {
            ValidatePassword(password);
            OneTimeToken record = await ConsumeOneTimeTokenAsync(value, OneTimeTokenPurposeEnum.PasswordReset, token).ConfigureAwait(false);
            User user = await _Db.Users.ReadAsync(record.TenantId, record.UserId, token).ConfigureAwait(false) ?? throw ApiException.InvalidToken(400, "The reset link is invalid or has expired.");
            await SetPasswordAsync(user, password!, null, token).ConfigureAwait(false);
            if (user.EmailVerifiedUtc == null)
            {
                user.EmailVerifiedUtc = DateTime.UtcNow;
                await _Db.Users.UpdateAsync(user, token).ConfigureAwait(false);
            }

            _LoginLimiter.Reset("email:" + user.EmailNormalized);
            await _Audit.WriteAsync("auth.password.reset", "success", user.TenantId, user.Id, "user", user.Id, null, null, token).ConfigureAwait(false);
            return user;
        }

        /// <summary>
        /// Change a password with the current one. Revokes every other session.
        /// </summary>
        /// <param name="principal">Caller.</param>
        /// <param name="currentPassword">Current password.</param>
        /// <param name="newPassword">New password.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">400, 401 InvalidCredentials.</exception>
        public async Task ChangePasswordAsync(AuthenticatedPrincipal principal, string? currentPassword, string? newPassword, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(principal);
            ValidatePassword(newPassword);
            if (!PasswordHasher.Verify(currentPassword, principal.User.PasswordHash, principal.User.PasswordSalt, principal.User.PasswordIterations)) throw ApiException.InvalidCredentials();
            await SetPasswordAsync(principal.User, newPassword!, principal.Session.Id, token).ConfigureAwait(false);
            await _Audit.WriteAsync("account.password.change", "success", principal.User.TenantId, principal.User.Id, "user", principal.User.Id, null, null, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Update a user's name.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="firstName">First name, or null to keep.</param>
        /// <param name="lastName">Last name, or null to keep.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated user.</returns>
        /// <exception cref="ApiException">400 when a value is too long.</exception>
        public async Task<User> UpdateProfileAsync(User user, string? firstName, string? lastName, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            if (firstName != null) user.FirstName = Limit(firstName, 100, "firstName");
            if (lastName != null) user.LastName = Limit(lastName, 100, "lastName");
            return await _Db.Users.UpdateAsync(user, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Delete a user and everything they own: machines (their tunnels close), sessions, tokens, push devices, subscriptions, overrides,
        /// tenant, and account.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="machines">Machine service, used to revoke and delete the user's machines.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">409 for a protected user.</exception>
        public async Task DeleteUserAsync(User user, MachineService machines, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            ArgumentNullException.ThrowIfNull(machines);
            if (user.IsProtected) throw ApiException.Conflict("Conflict", "The protected administrator cannot be deleted.");
            await machines.DeleteAllForUserAsync(user, token).ConfigureAwait(false);
            await _Db.Sessions.DeleteForUserAsync(user.TenantId, user.Id, token).ConfigureAwait(false);
            await _Db.OneTimeTokens.DeleteForUserAsync(user.TenantId, user.Id, token).ConfigureAwait(false);
            await _Db.Devices.DeleteForUserAsync(user.TenantId, user.Id, token).ConfigureAwait(false);
            await _Db.Users.DeleteAsync(user.TenantId, user.Id, token).ConfigureAwait(false);
            Account? account = await _Db.Accounts.ReadAsync(user.AccountId, token).ConfigureAwait(false);
            if (account != null && !account.IsProtected && account.OwnerUserId == user.Id)
            {
                await _Db.Subscriptions.DeleteForAccountAsync(account.Id, token).ConfigureAwait(false);
                await _Db.EntitlementOverrides.DeleteForAccountAsync(account.Id, token).ConfigureAwait(false);
                Tenant? tenant = await _Db.Tenants.ReadAsync(user.TenantId, token).ConfigureAwait(false);
                if (tenant != null && !tenant.IsProtected) await _Db.Tenants.DeleteAsync(tenant.Id, token).ConfigureAwait(false);
                await _Db.Accounts.DeleteAsync(account.Id, token).ConfigureAwait(false);
            }

            UserDisconnected?.Invoke(this, user);
            await _Audit.WriteAsync("account.delete", "success", user.TenantId, user.Id, "user", user.Id, null, null, token).ConfigureAwait(false);
            await _Notifier.SendAccountDeletedAsync(user, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Delete the caller's own account after confirming the password.
        /// </summary>
        /// <param name="principal">Caller.</param>
        /// <param name="password">Current password.</param>
        /// <param name="machines">Machine service.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">401 InvalidCredentials, 409 for a protected user.</exception>
        public async Task DeleteOwnAccountAsync(AuthenticatedPrincipal principal, string? password, MachineService machines, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(principal);
            if (!PasswordHasher.Verify(password, principal.User.PasswordHash, principal.User.PasswordSalt, principal.User.PasswordIterations)) throw ApiException.InvalidCredentials();
            await DeleteUserAsync(principal.User, machines, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Administrative password set. Sends no email. Revokes every session of the user except
        /// <paramref name="keepSessionId"/> (the administrator's own session when they set their own password).
        /// </summary>
        /// <param name="user">User whose password is set.</param>
        /// <param name="password">New password.</param>
        /// <param name="keepSessionId">Session to keep signed in, or null to revoke all.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">400 when the password does not meet the length policy.</exception>
        public async Task AdminSetPasswordAsync(User user, string? password, string? keepSessionId, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            ValidatePassword(password);
            await SetPasswordAsync(user, password!, keepSessionId, token, notify: false).ConfigureAwait(false);
            _LoginLimiter.Reset("email:" + user.EmailNormalized);
        }

        /// <summary>
        /// Administrative password reset: emails the user the standard reset link and changes nothing else.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">409 when the user is disabled.</exception>
        public async Task AdminSendPasswordResetAsync(User user, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            if (!user.Active) throw ApiException.Conflict("Conflict", "The user is disabled. Enable the user before sending a reset link.");
            string value = await CreateOneTimeTokenAsync(user, OneTimeTokenPurposeEnum.PasswordReset, _ResetLifetime, token).ConfigureAwait(false);
            await _Notifier.SendPasswordResetAsync(user, _Settings.Server.PublicUrl + "/reset?token=" + Uri.EscapeDataString(value), token).ConfigureAwait(false);
        }

        /// <summary>
        /// Administrative update of a user. Disabling a user revokes their sessions and disconnects their machines.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="active">Active flag, or null.</param>
        /// <param name="isAdmin">Admin flag, or null.</param>
        /// <param name="emailVerified">Verified flag, or null.</param>
        /// <param name="firstName">First name, or null.</param>
        /// <param name="lastName">Last name, or null.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated user.</returns>
        /// <exception cref="ApiException">409 when disabling or demoting the protected administrator.</exception>
        public async Task<User> AdminUpdateAsync(User user, bool? active, bool? isAdmin, bool? emailVerified, string? firstName, string? lastName, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            if (user.IsProtected && (active == false || isAdmin == false)) throw ApiException.Conflict("Conflict", "The protected administrator cannot be disabled or demoted.");
            bool disabling = active == false && user.Active;
            if (active.HasValue) user.Active = active.Value;
            if (isAdmin.HasValue) user.IsAdmin = isAdmin.Value;
            if (emailVerified.HasValue) user.EmailVerifiedUtc = emailVerified.Value ? (user.EmailVerifiedUtc ?? DateTime.UtcNow) : null;
            if (firstName != null) user.FirstName = Limit(firstName, 100, "firstName");
            if (lastName != null) user.LastName = Limit(lastName, 100, "lastName");
            await _Db.Users.UpdateAsync(user, token).ConfigureAwait(false);
            if (disabling)
            {
                await _Db.Sessions.RevokeAllForUserAsync(user.TenantId, user.Id, null, "user disabled", DateTime.UtcNow, token).ConfigureAwait(false);
                UserDisconnected?.Invoke(this, user);
            }

            return user;
        }

        /// <summary>
        /// Validate a password against the length policy.
        /// </summary>
        /// <param name="password">Password.</param>
        /// <exception cref="ApiException">400 when it is too short or too long.</exception>
        public void ValidatePassword(string? password)
        {
            int min = _Settings.Auth.MinimumPasswordLength;
            if (String.IsNullOrEmpty(password) || password.Length < min) throw ApiException.BadRequest("password must be at least " + min + " characters.");
            if (password.Length > 256) throw ApiException.BadRequest("password must be at most 256 characters.");
        }

        #endregion

        #region Private-Methods

        private async Task<LoginResult> IssueSessionAsync(User user, string client, string deviceName, string sourceIp, string userAgent, CancellationToken token)
        {
            DateTime now = DateTime.UtcNow;
            string refresh = SecretHash.CreateToken(Constants.RefreshTokenPrefix);
            AuthSession session = new AuthSession
            {
                TenantId = user.TenantId,
                UserId = user.Id,
                Client = client,
                DeviceName = deviceName,
                SourceIp = Truncate(sourceIp, 64),
                UserAgent = Truncate(userAgent, 500),
                RefreshTokenHash = SecretHash.Sha256Hex(refresh),
                RefreshExpiresUtc = now.AddDays(_Settings.Auth.RefreshTokenDays),
                LastUsedUtc = now,
                CreatedUtc = now
            };
            await _Db.Sessions.CreateAsync(session, token).ConfigureAwait(false);
            return BuildResult(user, session, refresh);
        }

        private LoginResult BuildResult(User user, AuthSession session, string refresh)
        {
            DateTime now = DateTime.UtcNow;
            DateTime accessExpires = now.AddMinutes(_Settings.Auth.AccessTokenMinutes);
            if (accessExpires > session.RefreshExpiresUtc) accessExpires = session.RefreshExpiresUtc;
            AccessTokenPayload payload = new AccessTokenPayload
            {
                SessionId = session.Id,
                UserId = user.Id,
                TenantId = user.TenantId,
                AccountId = user.AccountId,
                IssuedUtc = now,
                ExpiresUtc = accessExpires,
                Nonce = SecretHash.CreateToken(String.Empty, 16)
            };
            return new LoginResult
            {
                User = user,
                Session = session,
                AccessToken = _Protector.ProtectAccessToken(payload),
                AccessTokenExpiresUtc = accessExpires,
                RefreshToken = refresh,
                RefreshTokenExpiresUtc = session.RefreshExpiresUtc
            };
        }

        private async Task SetPasswordAsync(User user, string password, string? keepSessionId, CancellationToken token, bool notify = true)
        {
            _Hasher.Hash(password, out string hash, out string salt);
            user.PasswordHash = hash;
            user.PasswordSalt = salt;
            user.PasswordIterations = _Hasher.Iterations;
            user.PasswordAlgorithm = Constants.PasswordAlgorithm;
            await _Db.Users.UpdateAsync(user, token).ConfigureAwait(false);
            await _Db.Sessions.RevokeAllForUserAsync(user.TenantId, user.Id, keepSessionId, "password changed", DateTime.UtcNow, token).ConfigureAwait(false);
            if (notify) await _Notifier.SendPasswordChangedAsync(user, token).ConfigureAwait(false);
        }

        private async Task<string> CreateOneTimeTokenAsync(User user, OneTimeTokenPurposeEnum purpose, TimeSpan lifetime, CancellationToken token)
        {
            string prefix = purpose == OneTimeTokenPurposeEnum.EmailVerification ? Constants.EmailVerificationTokenPrefix : Constants.PasswordResetTokenPrefix;
            string value = SecretHash.CreateToken(prefix);
            OneTimeToken record = new OneTimeToken
            {
                TenantId = user.TenantId,
                UserId = user.Id,
                Purpose = purpose,
                TokenHash = SecretHash.Sha256Hex(value),
                ExpiresUtc = DateTime.UtcNow + lifetime
            };
            await _Db.OneTimeTokens.CreateAsync(record, token).ConfigureAwait(false);
            return value;
        }

        private async Task<OneTimeToken> ConsumeOneTimeTokenAsync(string? value, OneTimeTokenPurposeEnum purpose, CancellationToken token)
        {
            string message = purpose == OneTimeTokenPurposeEnum.EmailVerification ? "The verification link is invalid or has expired." : "The reset link is invalid or has expired.";
            if (String.IsNullOrWhiteSpace(value)) throw ApiException.InvalidToken(400, message);
            OneTimeToken? record = await _Db.OneTimeTokens.ReadByHashAsync(SecretHash.Sha256Hex(value.Trim()), token).ConfigureAwait(false);
            if (record == null || record.Purpose != purpose || record.UsedUtc != null || record.ExpiresUtc <= DateTime.UtcNow) throw ApiException.InvalidToken(400, message);
            if (!await _Db.OneTimeTokens.MarkUsedAsync(record.Id, DateTime.UtcNow, token).ConfigureAwait(false)) throw ApiException.InvalidToken(400, message);
            return record;
        }

        private void ConsumeAnonymous(string sourceIp)
        {
            if (!_AnonymousLimiter.TryConsume("ip:" + (sourceIp ?? String.Empty), out int retry)) throw ApiException.TooManyAttempts(retry);
        }

        private static void ValidateEmail(string email)
        {
            if (email.Length == 0 || email.Length > 254) throw ApiException.BadRequest("email must be a valid address of at most 254 characters.");
            try
            {
                MailAddress parsed = new MailAddress(email);
                if (!String.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase) || !email.Contains('@', StringComparison.Ordinal)) throw ApiException.BadRequest("email must be a valid address.");
            }
            catch (FormatException)
            {
                throw ApiException.BadRequest("email must be a valid address.");
            }
        }

        private static string Limit(string? value, int max, string field)
        {
            string trimmed = (value ?? String.Empty).Trim();
            if (trimmed.Length > max) throw ApiException.BadRequest(field + " must be at most " + max + " characters.");
            return trimmed;
        }

        private static string Truncate(string? value, int max)
        {
            if (String.IsNullOrEmpty(value)) return String.Empty;
            return value.Length <= max ? value : value.Substring(0, max);
        }

        #endregion
    }
}
