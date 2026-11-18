namespace MuxCloud.Core.Database.Sqlite.Queries
{
    using System.Collections.Generic;

    /// <summary>
    /// Sqlite schema: the migrations table and every versioned migration. Column types are Sqlite-specific.
    /// </summary>
    public static class SqliteSchemaQueries
    {
        #region Public-Methods

        /// <summary>
        /// Statement that creates schema_migrations when missing.
        /// </summary>
        /// <returns>DDL.</returns>
        public static string CreateMigrationsTable()
        {
            return "CREATE TABLE IF NOT EXISTS schema_migrations (\n" +
                "    version INTEGER NOT NULL PRIMARY KEY,\n" +
                "    description TEXT NOT NULL,\n" +
                "    applied_utc TEXT NOT NULL\n" +
                ")";
        }

        /// <summary>
        /// Every migration, in version order.
        /// </summary>
        /// <returns>Migrations.</returns>
        public static IReadOnlyList<SchemaMigration> Migrations()
        {
            return new List<SchemaMigration>
            {
                new SchemaMigration(1, "Initial schema", new List<string>
                {
                    "CREATE TABLE IF NOT EXISTS accounts (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    name TEXT NOT NULL,\n" +
                    "    owner_user_id TEXT NOT NULL,\n" +
                    "    active INTEGER NOT NULL,\n" +
                    "    is_protected INTEGER NOT NULL,\n" +
                    "    created_utc TEXT NOT NULL,\n" +
                    "    last_update_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE TABLE IF NOT EXISTS tenants (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    account_id TEXT NOT NULL,\n" +
                    "    name TEXT NOT NULL,\n" +
                    "    active INTEGER NOT NULL,\n" +
                    "    is_protected INTEGER NOT NULL,\n" +
                    "    created_utc TEXT NOT NULL,\n" +
                    "    last_update_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_tenants_account ON tenants (account_id)",
                    "CREATE TABLE IF NOT EXISTS users (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id TEXT NOT NULL,\n" +
                    "    account_id TEXT NOT NULL,\n" +
                    "    email TEXT NOT NULL,\n" +
                    "    email_normalized TEXT NOT NULL,\n" +
                    "    first_name TEXT NOT NULL,\n" +
                    "    last_name TEXT NOT NULL,\n" +
                    "    password_hash TEXT NOT NULL,\n" +
                    "    password_salt TEXT NOT NULL,\n" +
                    "    password_algorithm TEXT NOT NULL,\n" +
                    "    password_iterations INTEGER NOT NULL,\n" +
                    "    email_verified_utc TEXT,\n" +
                    "    terms_version TEXT NOT NULL,\n" +
                    "    terms_accepted_utc TEXT,\n" +
                    "    is_admin INTEGER NOT NULL,\n" +
                    "    is_tenant_admin INTEGER NOT NULL,\n" +
                    "    active INTEGER NOT NULL,\n" +
                    "    is_protected INTEGER NOT NULL,\n" +
                    "    last_login_utc TEXT,\n" +
                    "    created_utc TEXT NOT NULL,\n" +
                    "    last_update_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users (email_normalized)",
                    "CREATE INDEX IF NOT EXISTS ix_users_tenant ON users (tenant_id)",
                    "CREATE TABLE IF NOT EXISTS auth_sessions (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id TEXT NOT NULL,\n" +
                    "    user_id TEXT NOT NULL,\n" +
                    "    client TEXT NOT NULL,\n" +
                    "    device_name TEXT NOT NULL,\n" +
                    "    source_ip TEXT NOT NULL,\n" +
                    "    user_agent TEXT NOT NULL,\n" +
                    "    refresh_token_hash TEXT NOT NULL,\n" +
                    "    previous_refresh_token_hash TEXT NOT NULL,\n" +
                    "    refresh_expires_utc TEXT NOT NULL,\n" +
                    "    last_used_utc TEXT NOT NULL,\n" +
                    "    revoked_utc TEXT,\n" +
                    "    revocation_reason TEXT NOT NULL,\n" +
                    "    created_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_auth_sessions_user ON auth_sessions (tenant_id, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_auth_sessions_refresh ON auth_sessions (refresh_token_hash)",
                    "CREATE INDEX IF NOT EXISTS ix_auth_sessions_prev_refresh ON auth_sessions (previous_refresh_token_hash)",
                    "CREATE TABLE IF NOT EXISTS one_time_tokens (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id TEXT NOT NULL,\n" +
                    "    user_id TEXT NOT NULL,\n" +
                    "    purpose INTEGER NOT NULL,\n" +
                    "    token_hash TEXT NOT NULL,\n" +
                    "    expires_utc TEXT NOT NULL,\n" +
                    "    used_utc TEXT,\n" +
                    "    created_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_one_time_tokens_hash ON one_time_tokens (token_hash)",
                    "CREATE INDEX IF NOT EXISTS ix_one_time_tokens_user ON one_time_tokens (tenant_id, user_id)",
                    "CREATE TABLE IF NOT EXISTS machines (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id TEXT NOT NULL,\n" +
                    "    user_id TEXT NOT NULL,\n" +
                    "    name TEXT NOT NULL,\n" +
                    "    hostname TEXT NOT NULL,\n" +
                    "    os TEXT NOT NULL,\n" +
                    "    fingerprint TEXT NOT NULL,\n" +
                    "    mux_version TEXT NOT NULL,\n" +
                    "    protocol_version INTEGER NOT NULL,\n" +
                    "    secret_encrypted TEXT NOT NULL,\n" +
                    "    secret_last4 TEXT NOT NULL,\n" +
                    "    last_seen_utc TEXT,\n" +
                    "    last_connected_utc TEXT,\n" +
                    "    last_disconnected_utc TEXT,\n" +
                    "    active_runs INTEGER NOT NULL,\n" +
                    "    awaiting_approval INTEGER NOT NULL,\n" +
                    "    remote_tool_approval INTEGER NOT NULL,\n" +
                    "    revoked_utc TEXT,\n" +
                    "    created_utc TEXT NOT NULL,\n" +
                    "    last_update_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_machines_fingerprint ON machines (tenant_id, user_id, fingerprint)",
                    "CREATE INDEX IF NOT EXISTS ix_machines_tenant ON machines (tenant_id, user_id)",
                    "CREATE TABLE IF NOT EXISTS machine_connections (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id TEXT NOT NULL,\n" +
                    "    machine_id TEXT NOT NULL,\n" +
                    "    node_id TEXT NOT NULL,\n" +
                    "    remote_ip TEXT NOT NULL,\n" +
                    "    protocol_version INTEGER NOT NULL,\n" +
                    "    mux_version TEXT NOT NULL,\n" +
                    "    connected_utc TEXT NOT NULL,\n" +
                    "    disconnected_utc TEXT,\n" +
                    "    close_code INTEGER,\n" +
                    "    close_reason TEXT NOT NULL,\n" +
                    "    bytes_in INTEGER NOT NULL,\n" +
                    "    bytes_out INTEGER NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_machine_connections_machine ON machine_connections (tenant_id, machine_id)",
                    "CREATE TABLE IF NOT EXISTS plans (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    code TEXT NOT NULL,\n" +
                    "    name TEXT NOT NULL,\n" +
                    "    price_cents INTEGER NOT NULL,\n" +
                    "    currency TEXT NOT NULL,\n" +
                    "    billing_interval TEXT NOT NULL,\n" +
                    "    active INTEGER NOT NULL,\n" +
                    "    is_public INTEGER NOT NULL,\n" +
                    "    created_utc TEXT NOT NULL,\n" +
                    "    last_update_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_plans_code ON plans (code)",
                    "CREATE TABLE IF NOT EXISTS plan_features (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    plan_id TEXT NOT NULL,\n" +
                    "    feature_key TEXT NOT NULL,\n" +
                    "    limit_value INTEGER\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_plan_features_key ON plan_features (plan_id, feature_key)",
                    "CREATE TABLE IF NOT EXISTS subscriptions (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    account_id TEXT NOT NULL,\n" +
                    "    tenant_id TEXT NOT NULL,\n" +
                    "    plan_id TEXT NOT NULL,\n" +
                    "    status INTEGER NOT NULL,\n" +
                    "    provider TEXT NOT NULL,\n" +
                    "    provider_customer_id TEXT NOT NULL,\n" +
                    "    provider_subscription_id TEXT NOT NULL,\n" +
                    "    current_period_end_utc TEXT,\n" +
                    "    cancel_at_period_end INTEGER NOT NULL,\n" +
                    "    created_utc TEXT NOT NULL,\n" +
                    "    last_update_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_subscriptions_account ON subscriptions (account_id)",
                    "CREATE TABLE IF NOT EXISTS entitlement_overrides (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    account_id TEXT NOT NULL,\n" +
                    "    feature_key TEXT NOT NULL,\n" +
                    "    limit_value INTEGER,\n" +
                    "    reason TEXT NOT NULL,\n" +
                    "    expires_utc TEXT,\n" +
                    "    created_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_entitlement_overrides_account ON entitlement_overrides (account_id)",
                    "CREATE TABLE IF NOT EXISTS audit_records (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id TEXT NOT NULL,\n" +
                    "    user_id TEXT NOT NULL,\n" +
                    "    event_type TEXT NOT NULL,\n" +
                    "    result TEXT NOT NULL,\n" +
                    "    reason TEXT NOT NULL,\n" +
                    "    resource_type TEXT NOT NULL,\n" +
                    "    resource_id TEXT NOT NULL,\n" +
                    "    source_ip TEXT NOT NULL,\n" +
                    "    user_agent TEXT NOT NULL,\n" +
                    "    request_id TEXT NOT NULL,\n" +
                    "    message TEXT NOT NULL,\n" +
                    "    created_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_audit_records_created ON audit_records (created_utc)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_records_tenant ON audit_records (tenant_id, created_utc)",
                    "CREATE TABLE IF NOT EXISTS request_history (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id TEXT NOT NULL,\n" +
                    "    user_id TEXT NOT NULL,\n" +
                    "    method TEXT NOT NULL,\n" +
                    "    path TEXT NOT NULL,\n" +
                    "    path_template TEXT NOT NULL,\n" +
                    "    status_code INTEGER NOT NULL,\n" +
                    "    duration_ms REAL NOT NULL,\n" +
                    "    request_bytes INTEGER NOT NULL,\n" +
                    "    response_bytes INTEGER NOT NULL,\n" +
                    "    source_ip TEXT NOT NULL,\n" +
                    "    user_agent TEXT NOT NULL,\n" +
                    "    is_relay INTEGER NOT NULL,\n" +
                    "    request_headers TEXT NOT NULL,\n" +
                    "    response_headers TEXT NOT NULL,\n" +
                    "    request_body TEXT NOT NULL,\n" +
                    "    response_body TEXT NOT NULL,\n" +
                    "    request_body_truncated INTEGER NOT NULL,\n" +
                    "    response_body_truncated INTEGER NOT NULL,\n" +
                    "    created_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_request_history_created ON request_history (created_utc)"
                }),
                new SchemaMigration(2, "Push devices", new List<string>
                {
                    "CREATE TABLE IF NOT EXISTS devices (\n" +
                    "    id TEXT NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id TEXT NOT NULL,\n" +
                    "    user_id TEXT NOT NULL,\n" +
                    "    expo_push_token TEXT NOT NULL,\n" +
                    "    platform TEXT NOT NULL,\n" +
                    "    name TEXT NOT NULL,\n" +
                    "    created_utc TEXT NOT NULL,\n" +
                    "    last_update_utc TEXT NOT NULL\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_devices_token ON devices (tenant_id, user_id, expo_push_token)",
                    "CREATE INDEX IF NOT EXISTS ix_devices_user ON devices (tenant_id, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_devices_token ON devices (expo_push_token)"
                })
            };
        }

        #endregion
    }
}
