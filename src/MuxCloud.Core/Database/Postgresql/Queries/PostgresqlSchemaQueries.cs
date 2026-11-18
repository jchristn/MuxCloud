namespace MuxCloud.Core.Database.Postgresql.Queries
{
    using System.Collections.Generic;

    /// <summary>
    /// Postgresql schema: the migrations table and every versioned migration. Column types are Postgresql-specific.
    /// </summary>
    public static class PostgresqlSchemaQueries
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
                "    description VARCHAR(200) NOT NULL,\n" +
                "    applied_utc TIMESTAMPTZ NOT NULL\n" +
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
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    name VARCHAR(200) NOT NULL,\n" +
                    "    owner_user_id VARCHAR(64) NOT NULL,\n" +
                    "    active BOOLEAN NOT NULL,\n" +
                    "    is_protected BOOLEAN NOT NULL,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    last_update_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE TABLE IF NOT EXISTS tenants (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    account_id VARCHAR(64) NOT NULL,\n" +
                    "    name VARCHAR(200) NOT NULL,\n" +
                    "    active BOOLEAN NOT NULL,\n" +
                    "    is_protected BOOLEAN NOT NULL,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    last_update_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_tenants_account ON tenants (account_id)",
                    "CREATE TABLE IF NOT EXISTS users (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id VARCHAR(64) NOT NULL,\n" +
                    "    account_id VARCHAR(64) NOT NULL,\n" +
                    "    email VARCHAR(254) NOT NULL,\n" +
                    "    email_normalized VARCHAR(254) NOT NULL,\n" +
                    "    first_name VARCHAR(100) NOT NULL,\n" +
                    "    last_name VARCHAR(100) NOT NULL,\n" +
                    "    password_hash VARCHAR(200) NOT NULL,\n" +
                    "    password_salt VARCHAR(200) NOT NULL,\n" +
                    "    password_algorithm VARCHAR(50) NOT NULL,\n" +
                    "    password_iterations INTEGER NOT NULL,\n" +
                    "    email_verified_utc TIMESTAMPTZ,\n" +
                    "    terms_version VARCHAR(50) NOT NULL,\n" +
                    "    terms_accepted_utc TIMESTAMPTZ,\n" +
                    "    is_admin BOOLEAN NOT NULL,\n" +
                    "    is_tenant_admin BOOLEAN NOT NULL,\n" +
                    "    active BOOLEAN NOT NULL,\n" +
                    "    is_protected BOOLEAN NOT NULL,\n" +
                    "    last_login_utc TIMESTAMPTZ,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    last_update_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users (email_normalized)",
                    "CREATE INDEX IF NOT EXISTS ix_users_tenant ON users (tenant_id)",
                    "CREATE TABLE IF NOT EXISTS auth_sessions (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id VARCHAR(64) NOT NULL,\n" +
                    "    user_id VARCHAR(64) NOT NULL,\n" +
                    "    client VARCHAR(20) NOT NULL,\n" +
                    "    device_name VARCHAR(100) NOT NULL,\n" +
                    "    source_ip VARCHAR(64) NOT NULL,\n" +
                    "    user_agent VARCHAR(500) NOT NULL,\n" +
                    "    refresh_token_hash VARCHAR(128) NOT NULL,\n" +
                    "    previous_refresh_token_hash VARCHAR(128) NOT NULL,\n" +
                    "    refresh_expires_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    last_used_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    revoked_utc TIMESTAMPTZ,\n" +
                    "    revocation_reason VARCHAR(200) NOT NULL,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_auth_sessions_user ON auth_sessions (tenant_id, user_id)",
                    "CREATE INDEX IF NOT EXISTS ix_auth_sessions_refresh ON auth_sessions (refresh_token_hash)",
                    "CREATE INDEX IF NOT EXISTS ix_auth_sessions_prev_refresh ON auth_sessions (previous_refresh_token_hash)",
                    "CREATE TABLE IF NOT EXISTS one_time_tokens (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id VARCHAR(64) NOT NULL,\n" +
                    "    user_id VARCHAR(64) NOT NULL,\n" +
                    "    purpose INTEGER NOT NULL,\n" +
                    "    token_hash VARCHAR(128) NOT NULL,\n" +
                    "    expires_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    used_utc TIMESTAMPTZ,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_one_time_tokens_hash ON one_time_tokens (token_hash)",
                    "CREATE INDEX IF NOT EXISTS ix_one_time_tokens_user ON one_time_tokens (tenant_id, user_id)",
                    "CREATE TABLE IF NOT EXISTS machines (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id VARCHAR(64) NOT NULL,\n" +
                    "    user_id VARCHAR(64) NOT NULL,\n" +
                    "    name VARCHAR(100) NOT NULL,\n" +
                    "    hostname VARCHAR(200) NOT NULL,\n" +
                    "    os VARCHAR(200) NOT NULL,\n" +
                    "    fingerprint VARCHAR(128) NOT NULL,\n" +
                    "    mux_version VARCHAR(64) NOT NULL,\n" +
                    "    protocol_version INTEGER NOT NULL,\n" +
                    "    secret_encrypted VARCHAR(512) NOT NULL,\n" +
                    "    secret_last4 VARCHAR(8) NOT NULL,\n" +
                    "    last_seen_utc TIMESTAMPTZ,\n" +
                    "    last_connected_utc TIMESTAMPTZ,\n" +
                    "    last_disconnected_utc TIMESTAMPTZ,\n" +
                    "    active_runs INTEGER NOT NULL,\n" +
                    "    awaiting_approval INTEGER NOT NULL,\n" +
                    "    remote_tool_approval BOOLEAN NOT NULL,\n" +
                    "    revoked_utc TIMESTAMPTZ,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    last_update_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_machines_fingerprint ON machines (tenant_id, user_id, fingerprint)",
                    "CREATE INDEX IF NOT EXISTS ix_machines_tenant ON machines (tenant_id, user_id)",
                    "CREATE TABLE IF NOT EXISTS machine_connections (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id VARCHAR(64) NOT NULL,\n" +
                    "    machine_id VARCHAR(64) NOT NULL,\n" +
                    "    node_id VARCHAR(100) NOT NULL,\n" +
                    "    remote_ip VARCHAR(64) NOT NULL,\n" +
                    "    protocol_version INTEGER NOT NULL,\n" +
                    "    mux_version VARCHAR(64) NOT NULL,\n" +
                    "    connected_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    disconnected_utc TIMESTAMPTZ,\n" +
                    "    close_code INTEGER,\n" +
                    "    close_reason VARCHAR(200) NOT NULL,\n" +
                    "    bytes_in BIGINT NOT NULL,\n" +
                    "    bytes_out BIGINT NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_machine_connections_machine ON machine_connections (tenant_id, machine_id)",
                    "CREATE TABLE IF NOT EXISTS plans (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    code VARCHAR(64) NOT NULL,\n" +
                    "    name VARCHAR(100) NOT NULL,\n" +
                    "    price_cents BIGINT NOT NULL,\n" +
                    "    currency VARCHAR(8) NOT NULL,\n" +
                    "    billing_interval VARCHAR(16) NOT NULL,\n" +
                    "    active BOOLEAN NOT NULL,\n" +
                    "    is_public BOOLEAN NOT NULL,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    last_update_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_plans_code ON plans (code)",
                    "CREATE TABLE IF NOT EXISTS plan_features (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    plan_id VARCHAR(64) NOT NULL,\n" +
                    "    feature_key VARCHAR(100) NOT NULL,\n" +
                    "    limit_value BIGINT\n" +
                    ")",
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_plan_features_key ON plan_features (plan_id, feature_key)",
                    "CREATE TABLE IF NOT EXISTS subscriptions (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    account_id VARCHAR(64) NOT NULL,\n" +
                    "    tenant_id VARCHAR(64) NOT NULL,\n" +
                    "    plan_id VARCHAR(64) NOT NULL,\n" +
                    "    status INTEGER NOT NULL,\n" +
                    "    provider VARCHAR(32) NOT NULL,\n" +
                    "    provider_customer_id VARCHAR(200) NOT NULL,\n" +
                    "    provider_subscription_id VARCHAR(200) NOT NULL,\n" +
                    "    current_period_end_utc TIMESTAMPTZ,\n" +
                    "    cancel_at_period_end BOOLEAN NOT NULL,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL,\n" +
                    "    last_update_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_subscriptions_account ON subscriptions (account_id)",
                    "CREATE TABLE IF NOT EXISTS entitlement_overrides (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    account_id VARCHAR(64) NOT NULL,\n" +
                    "    feature_key VARCHAR(100) NOT NULL,\n" +
                    "    limit_value BIGINT,\n" +
                    "    reason VARCHAR(500) NOT NULL,\n" +
                    "    expires_utc TIMESTAMPTZ,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_entitlement_overrides_account ON entitlement_overrides (account_id)",
                    "CREATE TABLE IF NOT EXISTS audit_records (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id VARCHAR(64) NOT NULL,\n" +
                    "    user_id VARCHAR(64) NOT NULL,\n" +
                    "    event_type VARCHAR(100) NOT NULL,\n" +
                    "    result VARCHAR(20) NOT NULL,\n" +
                    "    reason VARCHAR(500) NOT NULL,\n" +
                    "    resource_type VARCHAR(50) NOT NULL,\n" +
                    "    resource_id VARCHAR(64) NOT NULL,\n" +
                    "    source_ip VARCHAR(64) NOT NULL,\n" +
                    "    user_agent VARCHAR(500) NOT NULL,\n" +
                    "    request_id VARCHAR(64) NOT NULL,\n" +
                    "    message VARCHAR(1000) NOT NULL,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_audit_records_created ON audit_records (created_utc)",
                    "CREATE INDEX IF NOT EXISTS ix_audit_records_tenant ON audit_records (tenant_id, created_utc)",
                    "CREATE TABLE IF NOT EXISTS request_history (\n" +
                    "    id VARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id VARCHAR(64) NOT NULL,\n" +
                    "    user_id VARCHAR(64) NOT NULL,\n" +
                    "    method VARCHAR(16) NOT NULL,\n" +
                    "    path VARCHAR(2048) NOT NULL,\n" +
                    "    path_template VARCHAR(512) NOT NULL,\n" +
                    "    status_code INTEGER NOT NULL,\n" +
                    "    duration_ms DOUBLE PRECISION NOT NULL,\n" +
                    "    request_bytes BIGINT NOT NULL,\n" +
                    "    response_bytes BIGINT NOT NULL,\n" +
                    "    source_ip VARCHAR(64) NOT NULL,\n" +
                    "    user_agent VARCHAR(500) NOT NULL,\n" +
                    "    is_relay BOOLEAN NOT NULL,\n" +
                    "    request_headers TEXT NOT NULL,\n" +
                    "    response_headers TEXT NOT NULL,\n" +
                    "    request_body TEXT NOT NULL,\n" +
                    "    response_body TEXT NOT NULL,\n" +
                    "    request_body_truncated BOOLEAN NOT NULL,\n" +
                    "    response_body_truncated BOOLEAN NOT NULL,\n" +
                    "    created_utc TIMESTAMPTZ NOT NULL\n" +
                    ")",
                    "CREATE INDEX IF NOT EXISTS ix_request_history_created ON request_history (created_utc)"
                })
            };
        }

        #endregion
    }
}
