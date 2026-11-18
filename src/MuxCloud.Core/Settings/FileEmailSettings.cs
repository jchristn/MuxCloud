namespace MuxCloud.Core.Settings
{
    using System;

    /// <summary>
    /// File email provider settings.
    /// </summary>
    public class FileEmailSettings
    {
        #region Public-Members

        /// <summary>
        /// Folder that receives rendered messages. Default ./email-outbox.
        /// </summary>
        public string Directory
        {
            get { return _Directory; }
            set { _Directory = String.IsNullOrWhiteSpace(value) ? "./email-outbox" : value; }
        }

        #endregion

        #region Private-Members

        private string _Directory = "./email-outbox";

        #endregion
    }
}
