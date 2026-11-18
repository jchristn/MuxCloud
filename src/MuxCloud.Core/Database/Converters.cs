namespace MuxCloud.Core.Database
{
    using System;
    using System.Data.Common;
    using System.Globalization;

    /// <summary>
    /// Typed reads from data readers that hide engine differences (SQLite text dates and integer booleans, MySQL tinyint).
    /// Thread safety: stateless.
    /// </summary>
    public static class Converters
    {
        #region Public-Methods

        /// <summary>
        /// Read a string column; null becomes empty.
        /// </summary>
        /// <param name="reader">Reader.</param>
        /// <param name="column">Column name.</param>
        /// <returns>Value.</returns>
        public static string String(DbDataReader reader, string column)
        {
            int i = reader.GetOrdinal(column);
            return reader.IsDBNull(i) ? System.String.Empty : Convert.ToString(reader.GetValue(i), CultureInfo.InvariantCulture) ?? System.String.Empty;
        }

        /// <summary>
        /// Read a boolean column.
        /// </summary>
        /// <param name="reader">Reader.</param>
        /// <param name="column">Column name.</param>
        /// <returns>Value; null is false.</returns>
        public static bool Bool(DbDataReader reader, string column)
        {
            int i = reader.GetOrdinal(column);
            if (reader.IsDBNull(i)) return false;
            object value = reader.GetValue(i);
            if (value is bool b) return b;
            return Convert.ToInt64(value, CultureInfo.InvariantCulture) != 0;
        }

        /// <summary>
        /// Read an integer column.
        /// </summary>
        /// <param name="reader">Reader.</param>
        /// <param name="column">Column name.</param>
        /// <returns>Value; null is 0.</returns>
        public static int Int(DbDataReader reader, string column)
        {
            int i = reader.GetOrdinal(column);
            return reader.IsDBNull(i) ? 0 : Convert.ToInt32(reader.GetValue(i), CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// Read a nullable integer column.
        /// </summary>
        /// <param name="reader">Reader.</param>
        /// <param name="column">Column name.</param>
        /// <returns>Value or null.</returns>
        public static int? NullableInt(DbDataReader reader, string column)
        {
            int i = reader.GetOrdinal(column);
            return reader.IsDBNull(i) ? null : Convert.ToInt32(reader.GetValue(i), CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// Read a 64-bit integer column.
        /// </summary>
        /// <param name="reader">Reader.</param>
        /// <param name="column">Column name.</param>
        /// <returns>Value; null is 0.</returns>
        public static long Long(DbDataReader reader, string column)
        {
            int i = reader.GetOrdinal(column);
            return reader.IsDBNull(i) ? 0L : Convert.ToInt64(reader.GetValue(i), CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// Read a nullable 64-bit integer column.
        /// </summary>
        /// <param name="reader">Reader.</param>
        /// <param name="column">Column name.</param>
        /// <returns>Value or null.</returns>
        public static long? NullableLong(DbDataReader reader, string column)
        {
            int i = reader.GetOrdinal(column);
            return reader.IsDBNull(i) ? null : Convert.ToInt64(reader.GetValue(i), CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// Read a floating point column.
        /// </summary>
        /// <param name="reader">Reader.</param>
        /// <param name="column">Column name.</param>
        /// <returns>Value; null is 0.</returns>
        public static double Double(DbDataReader reader, string column)
        {
            int i = reader.GetOrdinal(column);
            return reader.IsDBNull(i) ? 0.0 : Convert.ToDouble(reader.GetValue(i), CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// Read a UTC timestamp column.
        /// </summary>
        /// <param name="reader">Reader.</param>
        /// <param name="column">Column name.</param>
        /// <returns>Value; null is <see cref="DateTime.MinValue"/>.</returns>
        public static DateTime Utc(DbDataReader reader, string column)
        {
            DateTime? value = NullableUtc(reader, column);
            return value ?? DateTime.SpecifyKind(DateTime.MinValue, DateTimeKind.Utc);
        }

        /// <summary>
        /// Read a nullable UTC timestamp column.
        /// </summary>
        /// <param name="reader">Reader.</param>
        /// <param name="column">Column name.</param>
        /// <returns>Value or null.</returns>
        public static DateTime? NullableUtc(DbDataReader reader, string column)
        {
            int i = reader.GetOrdinal(column);
            if (reader.IsDBNull(i)) return null;
            object value = reader.GetValue(i);
            DateTime parsed;
            if (value is DateTime dt) parsed = dt;
            else if (value is DateTimeOffset dto) parsed = dto.UtcDateTime;
            else parsed = DateTime.Parse(Convert.ToString(value, CultureInfo.InvariantCulture) ?? System.String.Empty, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
            return parsed.Kind == DateTimeKind.Utc ? parsed : DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
        }

        /// <summary>
        /// Normalize a value for a parameter: DateTime values become UTC, enums become their integer value, null becomes DBNull.
        /// </summary>
        /// <param name="value">Value.</param>
        /// <returns>Parameter value.</returns>
        public static object ToParameter(object? value)
        {
            if (value == null) return DBNull.Value;
            if (value is DateTime dt)
            {
                if (dt.Kind == DateTimeKind.Utc) return dt;
                if (dt.Kind == DateTimeKind.Local) return dt.ToUniversalTime();
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            }

            if (value is Enum e) return Convert.ToInt32(e, CultureInfo.InvariantCulture);
            return value;
        }

        #endregion
    }
}
