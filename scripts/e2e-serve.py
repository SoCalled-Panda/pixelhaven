#!/usr/bin/env python3
"""Double-fork daemon: serves the pixelhaven dist build on :4173 for E2E."""
import os, sys, time, signal

DIST = "/home/z/my-project/pixelhaven/dist"
PIDFILE = "/home/z/my-project/pixelhaven/scripts/e2e-serve.pid"

def daemonize():
    if os.fork() > 0:
        os._exit(0)
    os.setsid()
    if os.fork() > 0:
        os._exit(0)
    devnull = os.open(os.devnull, os.O_RDWR)
    for fd in (0, 1, 2):
        os.dup2(devnull, fd)
    with open(PIDFILE, "w") as f:
        f.write(str(os.getpid()))

def serve():
    import http.server, socketserver
    socketserver.TCPServer.allow_reuse_address = True

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=DIST, **kw)
        def log_message(self, *a):
            pass

    class Server(socketserver.ThreadingTCPServer):
        daemon_threads = True

    httpd = Server(("0.0.0.0", 4173), Handler)
    signal.signal(signal.SIGTERM, lambda *a: os._exit(0))
    httpd.serve_forever()

if os.path.exists(PIDFILE):
    try:
        old = int(open(PIDFILE).read().strip())
        os.kill(old, signal.SIGTERM)
        time.sleep(0.5)
    except Exception:
        pass

daemonize()
time.sleep(0.3)
serve()
