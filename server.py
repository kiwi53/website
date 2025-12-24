import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

# Configuration
PORT = int(os.environ.get('PORT', '8000'))
# Serve from the project root so both `basic/` and `games/` are accessible
DIRECTORY = Path(__file__).parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        # Add headers to prevent caching during development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Simulate GitHub Pages behavior: serve 404.html for missing files
        # This allows client-side routing to work
        
        # First, try to serve the file normally
        original_path = self.path
        result = super().do_GET()
        
        return result
    
    def send_error(self, code, message=None):
        # When a 404 occurs, serve the 404.html file instead (like GitHub Pages does)
        if code == 404:
            try:
                # Try to read and serve 404.html
                error_file = DIRECTORY / '404.html'
                if error_file.exists():
                    with open(error_file, 'rb') as f:
                        content = f.read()
                    
                    self.send_response(404)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.send_header('Content-Length', str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                    return
            except Exception as e:
                print(f"Error serving 404.html: {e}")
        
        # Fallback to default error handling
        super().send_error(code, message)


def main():
    """Start the web server and open the browser"""
    
    # Change to the project root directory
    os.chdir(DIRECTORY)
    
    # Create the server
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 Server started successfully! (Simulating GitHub Pages)")
        print(f"📂 Serving files from: {DIRECTORY}")
        print(f"🌐 Open your browser at: http://localhost:{PORT}/")
        print(f"⏹️  Press Ctrl+C to stop the server")
        print(f"\n💡 Note: This simulates GitHub Pages static hosting.")
        print(f"   - No /api/games endpoint (games load from data.json files)")
        print(f"   - 404.html handles client-side routing\n")
        
        # Open the browser automatically to the site's home
        webbrowser.open(f'http://localhost:{PORT}/')
        
        try:
            # Start serving
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped. Goodbye!")

if __name__ == "__main__":
    main()
