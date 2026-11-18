namespace MuxCloud.Email.Providers
{
    using System;
    using System.Globalization;
    using System.IO;
    using System.Text;
    using System.Threading;
    using System.Threading.Tasks;

    /// <summary>
    /// Writes each message as an .html and a .txt file in a folder (development and tests). File names start with a UTC
    /// timestamp and the template key, then the recipient.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class FileEmailProvider : IEmailProvider
    {
        #region Public-Members

        /// <inheritdoc />
        public string Name
        {
            get { return "file"; }
        }

        /// <summary>
        /// Folder receiving messages.
        /// </summary>
        public string Directory { get; }

        #endregion

        #region Private-Members

        private static int _Counter = 0;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="directory">Folder; created when missing.</param>
        /// <exception cref="ArgumentException">directory is blank.</exception>
        public FileEmailProvider(string directory)
        {
            if (String.IsNullOrWhiteSpace(directory)) throw new ArgumentException("An outbox directory is required.", nameof(directory));
            Directory = directory;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<bool> SendAsync(EmailMessage message, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(message);
            System.IO.Directory.CreateDirectory(Directory);
            int n = Interlocked.Increment(ref _Counter);
            string stem = DateTime.UtcNow.ToString("yyyyMMddHHmmssfff", CultureInfo.InvariantCulture) + "-" + n.ToString("D5", CultureInfo.InvariantCulture) + "-" + Safe(message.TemplateKey) + "-" + Safe(message.To);
            string header = "To: " + message.To + "\nFrom: " + message.FromName + " <" + message.FromAddress + ">\nSubject: " + message.Subject + "\n\n";
            await File.WriteAllTextAsync(Path.Combine(Directory, stem + ".txt"), header + message.Text, Encoding.UTF8, token).ConfigureAwait(false);
            await File.WriteAllTextAsync(Path.Combine(Directory, stem + ".html"), message.Html, Encoding.UTF8, token).ConfigureAwait(false);
            message.ProviderMessageId = stem;
            return true;
        }

        #endregion

        #region Private-Methods

        private static string Safe(string value)
        {
            StringBuilder sb = new StringBuilder();
            foreach (char c in value ?? String.Empty) sb.Append(Char.IsLetterOrDigit(c) || c == '.' || c == '@' || c == '-' ? c : '_');
            return sb.Length == 0 ? "none" : sb.ToString();
        }

        #endregion
    }
}
