namespace MuxCloud.Protocol
{
    using System;

    /// <summary>
    /// A tunnel frame could not be parsed or violated the protocol.
    /// </summary>
    public class TunnelProtocolException : Exception
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="message">What was wrong, with context.</param>
        public TunnelProtocolException(string message) : base(message)
        {
        }

        /// <summary>
        /// Instantiate with an inner exception.
        /// </summary>
        /// <param name="message">What was wrong, with context.</param>
        /// <param name="inner">Underlying failure.</param>
        public TunnelProtocolException(string message, Exception inner) : base(message, inner)
        {
        }

        #endregion
    }
}
