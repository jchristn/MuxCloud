namespace MuxCloud.Core.Database
{
    /// <summary>
    /// Supported database engines.
    /// </summary>
    public enum DatabaseTypeEnum
    {
        /// <summary>
        /// SQLite (development default).
        /// </summary>
        Sqlite = 0,

        /// <summary>
        /// MySQL 8.
        /// </summary>
        Mysql = 1,

        /// <summary>
        /// PostgreSQL (production default).
        /// </summary>
        Postgresql = 2,

        /// <summary>
        /// Microsoft SQL Server.
        /// </summary>
        SqlServer = 3
    }
}
