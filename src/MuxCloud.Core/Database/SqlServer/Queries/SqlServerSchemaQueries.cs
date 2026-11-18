namespace MuxCloud.Core.Database.SqlServer.Queries
{
    using System.Collections.Generic;

    /// <summary>
    /// SqlServer schema: the migrations table and every versioned migration. Column types are SqlServer-specific.
    /// </summary>
    public static class SqlServerSchemaQueries
    {
        #region Public-Methods

        /// <summary>
        /// Statement that creates schema_migrations when missing.
        /// </summary>
        /// <returns>DDL.</returns>
        public static string CreateMigrationsTable()
        {
            return "IF OBJECT_ID(N'schema_migrations', N'U') IS NULL\n" +
                "CREATE TABLE schema_migrations (\n" +
                "    version INT NOT NULL PRIMARY KEY,\n" +
                "    description NVARCHAR(200) NOT NULL,\n" +
                "    applied_utc DATETIME2 NOT NULL\n" +
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
                    "IF OBJECT_ID(N'accounts', N'U') IS NULL\n" +
                    "CREATE TABLE accounts (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    name NVARCHAR(200) NOT NULL,\n" +
                    "    owner_user_id NVARCHAR(64) NOT NULL,\n" +
                    "    active BIT NOT NULL,\n" +
                    "    is_protected BIT NOT NULL,\n" +
                    "    created_utc DATETIME2 NOT NULL,\n" +
                    "    last_update_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF OBJECT_ID(N'tenants', N'U') IS NULL\n" +
                    "CREATE TABLE tenants (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    account_id NVARCHAR(64) NOT NULL,\n" +
                    "    name NVARCHAR(200) NOT NULL,\n" +
                    "    active BIT NOT NULL,\n" +
                    "    is_protected BIT NOT NULL,\n" +
                    "    created_utc DATETIME2 NOT NULL,\n" +
                    "    last_update_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_tenants_account')\n" +
                    "CREATE INDEX ix_tenants_account ON tenants (account_id)",
                    "IF OBJECT_ID(N'users', N'U') IS NULL\n" +
                    "CREATE TABLE users (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id NVARCHAR(64) NOT NULL,\n" +
                    "    account_id NVARCHAR(64) NOT NULL,\n" +
                    "    email NVARCHAR(254) NOT NULL,\n" +
                    "    email_normalized NVARCHAR(254) NOT NULL,\n" +
                    "    first_name NVARCHAR(100) NOT NULL,\n" +
                    "    last_name NVARCHAR(100) NOT NULL,\n" +
                    "    password_hash NVARCHAR(200) NOT NULL,\n" +
                    "    password_salt NVARCHAR(200) NOT NULL,\n" +
                    "    password_algorithm NVARCHAR(50) NOT NULL,\n" +
                    "    password_iterations INT NOT NULL,\n" +
                    "    email_verified_utc DATETIME2,\n" +
                    "    terms_version NVARCHAR(50) NOT NULL,\n" +
                    "    terms_accepted_utc DATETIME2,\n" +
                    "    is_admin BIT NOT NULL,\n" +
                    "    is_tenant_admin BIT NOT NULL,\n" +
                    "    active BIT NOT NULL,\n" +
                    "    is_protected BIT NOT NULL,\n" +
                    "    last_login_utc DATETIME2,\n" +
                    "    created_utc DATETIME2 NOT NULL,\n" +
                    "    last_update_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_users_email')\n" +
                    "CREATE UNIQUE INDEX ux_users_email ON users (email_normalized)",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_users_tenant')\n" +
                    "CREATE INDEX ix_users_tenant ON users (tenant_id)",
                    "IF OBJECT_ID(N'auth_sessions', N'U') IS NULL\n" +
                    "CREATE TABLE auth_sessions (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id NVARCHAR(64) NOT NULL,\n" +
                    "    user_id NVARCHAR(64) NOT NULL,\n" +
                    "    client NVARCHAR(20) NOT NULL,\n" +
                    "    device_name NVARCHAR(100) NOT NULL,\n" +
                    "    source_ip NVARCHAR(64) NOT NULL,\n" +
                    "    user_agent NVARCHAR(500) NOT NULL,\n" +
                    "    refresh_token_hash NVARCHAR(128) NOT NULL,\n" +
                    "    previous_refresh_token_hash NVARCHAR(128) NOT NULL,\n" +
                    "    refresh_expires_utc DATETIME2 NOT NULL,\n" +
                    "    last_used_utc DATETIME2 NOT NULL,\n" +
                    "    revoked_utc DATETIME2,\n" +
                    "    revocation_reason NVARCHAR(200) NOT NULL,\n" +
                    "    created_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_auth_sessions_user')\n" +
                    "CREATE INDEX ix_auth_sessions_user ON auth_sessions (tenant_id, user_id)",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_auth_sessions_refresh')\n" +
                    "CREATE INDEX ix_auth_sessions_refresh ON auth_sessions (refresh_token_hash)",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_auth_sessions_prev_refresh')\n" +
                    "CREATE INDEX ix_auth_sessions_prev_refresh ON auth_sessions (previous_refresh_token_hash)",
                    "IF OBJECT_ID(N'one_time_tokens', N'U') IS NULL\n" +
                    "CREATE TABLE one_time_tokens (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id NVARCHAR(64) NOT NULL,\n" +
                    "    user_id NVARCHAR(64) NOT NULL,\n" +
                    "    purpose INT NOT NULL,\n" +
                    "    token_hash NVARCHAR(128) NOT NULL,\n" +
                    "    expires_utc DATETIME2 NOT NULL,\n" +
                    "    used_utc DATETIME2,\n" +
                    "    created_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_one_time_tokens_hash')\n" +
                    "CREATE UNIQUE INDEX ux_one_time_tokens_hash ON one_time_tokens (token_hash)",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_one_time_tokens_user')\n" +
                    "CREATE INDEX ix_one_time_tokens_user ON one_time_tokens (tenant_id, user_id)",
                    "IF OBJECT_ID(N'machines', N'U') IS NULL\n" +
                    "CREATE TABLE machines (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id NVARCHAR(64) NOT NULL,\n" +
                    "    user_id NVARCHAR(64) NOT NULL,\n" +
                    "    name NVARCHAR(100) NOT NULL,\n" +
                    "    hostname NVARCHAR(200) NOT NULL,\n" +
                    "    os NVARCHAR(200) NOT NULL,\n" +
                    "    fingerprint NVARCHAR(128) NOT NULL,\n" +
                    "    mux_version NVARCHAR(64) NOT NULL,\n" +
                    "    protocol_version INT NOT NULL,\n" +
                    "    secret_encrypted NVARCHAR(512) NOT NULL,\n" +
                    "    secret_last4 NVARCHAR(8) NOT NULL,\n" +
                    "    last_seen_utc DATETIME2,\n" +
                    "    last_connected_utc DATETIME2,\n" +
                    "    last_disconnected_utc DATETIME2,\n" +
                    "    active_runs INT NOT NULL,\n" +
                    "    awaiting_approval INT NOT NULL,\n" +
                    "    remote_tool_approval BIT NOT NULL,\n" +
                    "    revoked_utc DATETIME2,\n" +
                    "    created_utc DATETIME2 NOT NULL,\n" +
                    "    last_update_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_machines_fingerprint')\n" +
                    "CREATE UNIQUE INDEX ux_machines_fingerprint ON machines (tenant_id, user_id, fingerprint)",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_machines_tenant')\n" +
                    "CREATE INDEX ix_machines_tenant ON machines (tenant_id, user_id)",
                    "IF OBJECT_ID(N'machine_connections', N'U') IS NULL\n" +
                    "CREATE TABLE machine_connections (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id NVARCHAR(64) NOT NULL,\n" +
                    "    machine_id NVARCHAR(64) NOT NULL,\n" +
                    "    node_id NVARCHAR(100) NOT NULL,\n" +
                    "    remote_ip NVARCHAR(64) NOT NULL,\n" +
                    "    protocol_version INT NOT NULL,\n" +
                    "    mux_version NVARCHAR(64) NOT NULL,\n" +
                    "    connected_utc DATETIME2 NOT NULL,\n" +
                    "    disconnected_utc DATETIME2,\n" +
                    "    close_code INT,\n" +
                    "    close_reason NVARCHAR(200) NOT NULL,\n" +
                    "    bytes_in BIGINT NOT NULL,\n" +
                    "    bytes_out BIGINT NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_machine_connections_machine')\n" +
                    "CREATE INDEX ix_machine_connections_machine ON machine_connections (tenant_id, machine_id)",
                    "IF OBJECT_ID(N'plans', N'U') IS NULL\n" +
                    "CREATE TABLE plans (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    code NVARCHAR(64) NOT NULL,\n" +
                    "    name NVARCHAR(100) NOT NULL,\n" +
                    "    price_cents BIGINT NOT NULL,\n" +
                    "    currency NVARCHAR(8) NOT NULL,\n" +
                    "    billing_interval NVARCHAR(16) NOT NULL,\n" +
                    "    active BIT NOT NULL,\n" +
                    "    is_public BIT NOT NULL,\n" +
                    "    created_utc DATETIME2 NOT NULL,\n" +
                    "    last_update_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_plans_code')\n" +
                    "CREATE UNIQUE INDEX ux_plans_code ON plans (code)",
                    "IF OBJECT_ID(N'plan_features', N'U') IS NULL\n" +
                    "CREATE TABLE plan_features (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    plan_id NVARCHAR(64) NOT NULL,\n" +
                    "    feature_key NVARCHAR(100) NOT NULL,\n" +
                    "    limit_value BIGINT\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_plan_features_key')\n" +
                    "CREATE UNIQUE INDEX ux_plan_features_key ON plan_features (plan_id, feature_key)",
                    "IF OBJECT_ID(N'subscriptions', N'U') IS NULL\n" +
                    "CREATE TABLE subscriptions (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    account_id NVARCHAR(64) NOT NULL,\n" +
                    "    tenant_id NVARCHAR(64) NOT NULL,\n" +
                    "    plan_id NVARCHAR(64) NOT NULL,\n" +
                    "    status INT NOT NULL,\n" +
                    "    provider NVARCHAR(32) NOT NULL,\n" +
                    "    provider_customer_id NVARCHAR(200) NOT NULL,\n" +
                    "    provider_subscription_id NVARCHAR(200) NOT NULL,\n" +
                    "    current_period_end_utc DATETIME2,\n" +
                    "    cancel_at_period_end BIT NOT NULL,\n" +
                    "    created_utc DATETIME2 NOT NULL,\n" +
                    "    last_update_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_subscriptions_account')\n" +
                    "CREATE INDEX ix_subscriptions_account ON subscriptions (account_id)",
                    "IF OBJECT_ID(N'entitlement_overrides', N'U') IS NULL\n" +
                    "CREATE TABLE entitlement_overrides (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    account_id NVARCHAR(64) NOT NULL,\n" +
                    "    feature_key NVARCHAR(100) NOT NULL,\n" +
                    "    limit_value BIGINT,\n" +
                    "    reason NVARCHAR(500) NOT NULL,\n" +
                    "    expires_utc DATETIME2,\n" +
                    "    created_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_entitlement_overrides_account')\n" +
                    "CREATE INDEX ix_entitlement_overrides_account ON entitlement_overrides (account_id)",
                    "IF OBJECT_ID(N'audit_records', N'U') IS NULL\n" +
                    "CREATE TABLE audit_records (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id NVARCHAR(64) NOT NULL,\n" +
                    "    user_id NVARCHAR(64) NOT NULL,\n" +
                    "    event_type NVARCHAR(100) NOT NULL,\n" +
                    "    result NVARCHAR(20) NOT NULL,\n" +
                    "    reason NVARCHAR(500) NOT NULL,\n" +
                    "    resource_type NVARCHAR(50) NOT NULL,\n" +
                    "    resource_id NVARCHAR(64) NOT NULL,\n" +
                    "    source_ip NVARCHAR(64) NOT NULL,\n" +
                    "    user_agent NVARCHAR(500) NOT NULL,\n" +
                    "    request_id NVARCHAR(64) NOT NULL,\n" +
                    "    message NVARCHAR(1000) NOT NULL,\n" +
                    "    created_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_audit_records_created')\n" +
                    "CREATE INDEX ix_audit_records_created ON audit_records (created_utc)",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_audit_records_tenant')\n" +
                    "CREATE INDEX ix_audit_records_tenant ON audit_records (tenant_id, created_utc)",
                    "IF OBJECT_ID(N'request_history', N'U') IS NULL\n" +
                    "CREATE TABLE request_history (\n" +
                    "    id NVARCHAR(64) NOT NULL PRIMARY KEY,\n" +
                    "    tenant_id NVARCHAR(64) NOT NULL,\n" +
                    "    user_id NVARCHAR(64) NOT NULL,\n" +
                    "    method NVARCHAR(16) NOT NULL,\n" +
                    "    path NVARCHAR(2048) NOT NULL,\n" +
                    "    path_template NVARCHAR(512) NOT NULL,\n" +
                    "    status_code INT NOT NULL,\n" +
                    "    duration_ms FLOAT NOT NULL,\n" +
                    "    request_bytes BIGINT NOT NULL,\n" +
                    "    response_bytes BIGINT NOT NULL,\n" +
                    "    source_ip NVARCHAR(64) NOT NULL,\n" +
                    "    user_agent NVARCHAR(500) NOT NULL,\n" +
                    "    is_relay BIT NOT NULL,\n" +
                    "    request_headers NVARCHAR(MAX) NOT NULL,\n" +
                    "    response_headers NVARCHAR(MAX) NOT NULL,\n" +
                    "    request_body NVARCHAR(MAX) NOT NULL,\n" +
                    "    response_body NVARCHAR(MAX) NOT NULL,\n" +
                    "    request_body_truncated BIT NOT NULL,\n" +
                    "    response_body_truncated BIT NOT NULL,\n" +
                    "    created_utc DATETIME2 NOT NULL\n" +
                    ")",
                    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_request_history_created')\n" +
                    "CREATE INDEX ix_request_history_created ON request_history (created_utc)"
                })
            };
        }

        #endregion
    }
}
