"""Entry-point script to start the Farm AI FastAPI development server.

Usage (from project root):
    python scripts/run_api.py
    python scripts/run_api.py --port 8001
"""
import os
import sys
import socket
import argparse
import uvicorn

# Ensure 'src' is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../src")))

from farm_ai.config.settings import API_HOST, API_PORT


def is_port_in_use(host: str, port: int) -> bool:
    """Checks if a network port is already occupied."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host if host != "0.0.0.0" else "127.0.0.1", port)) == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start Farm AI FastAPI Backend")
    parser.add_argument("--host", default=API_HOST, help=f"Host interface (default: {API_HOST})")
    parser.add_argument("--port", type=int, default=None, help=f"Port number (default: {API_PORT})")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reloading")

    args = parser.parse_args()

    port = args.port or API_PORT
    # If default port is occupied, automatically check port + 1
    if args.port is None and is_port_in_use(args.host, port):
        fallback_port = port + 1
        print(f"[Notice] Port {port} is already in use. Auto-switching to port {fallback_port}.")
        port = fallback_port

    print(f"Starting Autonomous Farm AI API server on http://{args.host}:{port}")
    print(f"API Documentation available at: http://{args.host}:{port}/docs")
    uvicorn.run(
        "farm_ai.api.main:app",
        host=args.host,
        port=port,
        reload=not args.no_reload,
    )
