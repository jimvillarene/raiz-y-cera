#!/usr/bin/env python3
"""
Module: portable_cms_server
Description: Lightweight object-oriented HTTP server for the Raíz y Cera platform.
             Serves static storefront assets and provides REST API persistence
             for the CMS data store (data/cms_store.json) when hosted on a dynamic
             paid hosting provider (VPS, cPanel, Railway, Heroku, Docker) or during
             local development.

Author: Antigravity AI Agent
License: Proprietary / Internal

Version History:
- v1.0.0 | 2026-11-20 | Initial production release
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import shutil
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Any, Dict, Optional


class PortableCMSRequestHandler(SimpleHTTPRequestHandler):
    """Custom HTTP request handler with REST endpoints for CMS persistence."""

    server_root_dir: Path = Path(__file__).resolve().parent.parent

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(self.server_root_dir), **kwargs)

    def do_POST(self) -> None:
        """Handles incoming POST requests to REST endpoints."""
        parsed_path = self.path.split("?")[0].rstrip("/")

        if parsed_path == "/api/cms/store":
            self._handle_cms_store_save()
        elif parsed_path == "/api/stripe/checkout-session":
            self._handle_stripe_session()
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found.")

    def _handle_cms_store_save(self) -> None:
        """Persists updated CMS state to data/cms_store.json with automatic backup."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0:
                self._send_json_response(
                    HTTPStatus.BAD_REQUEST, {"error": "Empty payload received."}
                )
                return

            raw_bytes = self.rfile.read(content_length)
            payload = json.loads(raw_bytes.decode("utf-8"))

            if "siteConfig" not in payload or "products" not in payload:
                self._send_json_response(
                    HTTPStatus.UNPROCESSABLE_ENTITY,
                    {"error": "Payload missing required schema keys."},
                )
                return

            target_file = self.server_root_dir / "data" / "cms_store.json"
            target_file.parent.mkdir(parents=True, exist_ok=True)

            # Create timestamped backup if existing file exists
            if target_file.exists():
                backup_dir = self.server_root_dir / "data" / "backups"
                backup_dir.mkdir(parents=True, exist_ok=True)
                ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
                backup_file = backup_dir / f"cms_store_backup_{ts}.json"
                shutil.copy2(target_file, backup_file)

            # Atomic write
            temp_file = target_file.with_suffix(".tmp")
            temp_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
            temp_file.replace(target_file)

            self._send_json_response(
                HTTPStatus.OK,
                {
                    "success": True,
                    "message": "CMS state successfully saved to disk.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )
        except Exception as exc:
            self._send_json_response(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"error": f"Failed to persist CMS store: {str(exc)}"},
            )

    def _handle_stripe_session(self) -> None:
        """Simulates or provisions a Stripe Checkout session."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw_bytes = self.rfile.read(content_length)
            payload = json.loads(raw_bytes.decode("utf-8"))

            cart = payload.get("cart", {})
            grand_total = cart.get("grandTotal", 0)

            folio = f"RC-{datetime.now().year}-{os.urandom(3).hex().upper()}"
            self._send_json_response(
                HTTPStatus.OK,
                {
                    "success": True,
                    "folio": folio,
                    "amount": grand_total,
                    "currency": "mxn",
                    "status": "simulated_session_ready",
                },
            )
        except Exception as exc:
            self._send_json_response(
                HTTPStatus.BAD_REQUEST,
                {"error": f"Invalid session payload: {str(exc)}"},
            )

    def _send_json_response(self, status: HTTPStatus, data: Dict[str, Any]) -> None:
        """Helper to send a JSON HTTP response."""
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(response_bytes)

    def end_headers(self) -> None:
        """Appends security and caching headers."""
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        super().end_headers()


class PortableCMSServer:
    """Manages the lifecycle of the portable Raíz y Cera HTTP server."""

    def __init__(self, host: str = "0.0.0.0", port: int = 8080, root_dir: Optional[Path] = None) -> None:
        self._host = host
        self._port = port
        self._root_dir = (root_dir or Path(__file__).resolve().parent.parent).resolve()

    def run(self) -> None:
        """Starts the HTTP server loop."""
        PortableCMSRequestHandler.server_root_dir = self._root_dir
        mimetypes.add_type("application/javascript", ".js")
        mimetypes.add_type("application/json", ".json")

        server = HTTPServer((self._host, self._port), PortableCMSRequestHandler)
        print(f"✨ Raíz y Cera Portable CMS Server running at http://localhost:{self._port}/")
        print(f"   Root directory: {self._root_dir}")
        print(f"   Storefront URL: http://localhost:{self._port}/index.html")
        print(f"   Admin CMS URL:  http://localhost:{self._port}/admin.html")
        print("   Press Ctrl+C to stop.")

        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
        finally:
            server.server_close()


def main() -> None:
    """CLI entry point for starting the portable server."""
    parser = argparse.ArgumentParser(description="Raíz y Cera Portable CMS Server")
    parser.add_argument("--host", default="0.0.0.0", help="Binding host address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8080, help="Binding TCP port (default: 8080)")
    args = parser.parse_args()

    server = PortableCMSServer(host=args.host, port=args.port)
    server.run()


if __name__ == "__main__":
    main()
