#!/usr/bin/env python3
"""Scripted OpenAI-compatible chat server for Mux Cloud end-to-end tests.

Behavior is chosen from the last user message:
  contains "E2E_TOOL"  -> first turn asks for a run_process tool call (needs approval),
                          the turn after the tool result streams "Tool finished."
  contains "E2E_SLOW"  -> streams one word every second for 60 seconds (for cancel tests)
  anything else        -> streams a short reply in ten chunks, 150 ms apart
After a tool result the reply says TOOL_OUTPUT_SEEN when the command really ran, else TOOL_OUTPUT_MISSING.

Usage: fake-llm.py <port>
"""

import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MODEL = "e2e-fake"


def last_user_text(messages):
    for m in reversed(messages):
        if m.get("role") == "user":
            c = m.get("content")
            if isinstance(c, list):
                return " ".join(p.get("text", "") for p in c if isinstance(p, dict))
            return c or ""
    return ""


def last_role(messages):
    return messages[-1].get("role") if messages else ""


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("[fake-llm] " + (fmt % args) + "\n")

    def _json(self, status, obj):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.rstrip("/").endswith("/models"):
            self._json(200, {"object": "list", "data": [{"id": MODEL, "object": "model"}]})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        req = json.loads(self.rfile.read(length) or b"{}")
        messages = req.get("messages", [])
        text = last_user_text(messages)
        stream = bool(req.get("stream"))

        if "E2E_TOOL" in text and last_role(messages) != "tool":
            self._tool_call(stream)
            return

        if "E2E_SLOW" in text and last_role(messages) != "tool":
            words = ["slow-%d" % i for i in range(60)]
            delay = 1.0
        elif last_role(messages) == "tool":
            result = str(messages[-1].get("content") or "")
            outcome = "TOOL_OUTPUT_SEEN" if "e2e-tool-ran" in result else "TOOL_OUTPUT_MISSING"
            words = ["Tool", "finished.", outcome]
            delay = 0.1
        else:
            words = ["Hello", "from", "the", "fake", "model,", "streamed", "in", "ten", "small", "chunks."]
            delay = 0.15

        if not stream:
            self._json(200, {
                "id": "cmpl-e2e", "object": "chat.completion", "model": MODEL,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": " ".join(words)}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": 10, "completion_tokens": len(words), "total_tokens": 10 + len(words)},
            })
            return

        self._start_sse()
        try:
            for i, w in enumerate(words):
                self._chunk({"content": (w if i == 0 else " " + w)})
                time.sleep(delay)
            self._chunk({}, finish="stop")
            self._done()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _tool_call(self, stream):
        call = {"id": "call_e2e_1", "type": "function",
                "function": {"name": "run_process", "arguments": json.dumps({"command": "echo e2e-tool-ran"})}}
        if not stream:
            self._json(200, {
                "id": "cmpl-e2e", "object": "chat.completion", "model": MODEL,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": None, "tool_calls": [call]}, "finish_reason": "tool_calls"}],
            })
            return
        self._start_sse()
        self._chunk({"role": "assistant", "tool_calls": [{"index": 0, **call}]})
        self._chunk({}, finish="tool_calls")
        self._done()

    def _start_sse(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True

    def _chunk(self, delta, finish=None):
        obj = {"id": "chunk-e2e", "object": "chat.completion.chunk", "model": MODEL,
               "choices": [{"index": 0, "delta": delta, "finish_reason": finish}]}
        self.wfile.write(("data: " + json.dumps(obj) + "\n\n").encode())
        self.wfile.flush()

    def _done(self):
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
