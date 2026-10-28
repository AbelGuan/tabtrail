"""Local demo preview with caching disabled for HTML, modules and styles."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Preview edits must never reuse a conditional 304 response.
        for name in ('If-Modified-Since', 'If-None-Match'):
            if name in self.headers:
                del self.headers[name]
        super().do_GET()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4196)
    parser.add_argument('--directory', type=Path)
    args = parser.parse_args()
    root = args.directory.resolve() if args.directory else Path(__file__).resolve().parents[1] / 'extension'
    handler = partial(PreviewHandler, directory=str(root))
    ThreadingHTTPServer(('127.0.0.1', args.port), handler).serve_forever()
