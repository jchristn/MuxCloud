# MuxCloud.Protocol

Wire contracts for the Mux Cloud tunnel. A mux machine keeps one persistent outbound WebSocket to Mux Cloud
(`wss://app.usemux.ai/v1.0/tunnel`). The cloud relays REST, streamed (SSE), and WebSocket traffic from the Mux Cloud
dashboard and mobile app down that tunnel to the machine's local `mux serve` API.

The package contains the envelope and payload models, the handshake proof helpers, close and error codes,
capability names, and the reconnect backoff policy. It has no dependencies beyond the .NET base class library.

The full protocol reference is [WEBSOCKETS_API.md](https://github.com/jchristn/MuxCloud/blob/main/WEBSOCKETS_API.md).

MIT licensed. See the [repository](https://github.com/jchristn/MuxCloud).
