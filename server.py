import http.server
import socketserver
import webbrowser
import os
import json
import urllib.parse
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
        # Handle URL routing
        if self.path.startswith('/api/games'):
            self.handle_api_games()
            return
        
        # Route /website to index.html
        if self.path == '/website' or self.path == '/website/':
            self.path = '/index.html'
        
        # Route /website/game-launcher to Game Launcher/game-launcher.html
        elif self.path == '/website/game-launcher' or self.path == '/website/game-launcher/':
            self.path = '/Game Launcher/game-launcher.html'
        
        # Route /website/game-launcher/<game-name> to game player with game URL
        elif self.path.startswith('/website/game-launcher/'):
            game_name = urllib.parse.unquote(self.path[len('/website/game-launcher/'):].strip('/'))
            # Find game by name
            game_url = self.find_game_url_by_name(game_name)
            if game_url:
                # Serve game player with the game URL
                self.serve_game_player(game_url, game_name)
                return
            else:
                self.send_error(404, f"Game not found: {game_name}")
                return
        
        # Route /website/macro to Macro/index.html
        elif self.path == '/website/macro' or self.path == '/website/macro/':
            self.path = '/Macro/index.html'
        
        # Route /website/malware to Malware/malware.html
        elif self.path == '/website/malware' or self.path == '/website/malware/':
            self.path = '/Malware/malware.html'
        
        # Route /website/<game-name> to game directly without bar
        elif self.path.startswith('/website/') and self.path.count('/') == 2:
            game_name = urllib.parse.unquote(self.path[len('/website/'):].strip('/'))
            # Avoid conflicts with known routes
            if game_name not in ['game-launcher', 'macro', 'malware']:
                game_url = self.find_game_url_by_name(game_name)
                if game_url:
                    # Redirect to the actual game URL
                    self.send_response(302)
                    self.send_header('Location', game_url)
                    self.end_headers()
                    return
        
        return super().do_GET()
    
    def find_game_url_by_name(self, game_name):
        """Find the game URL by searching for a matching game name"""
        # Convert hyphens back to spaces for matching
        game_name_with_spaces = game_name.replace('-', ' ')
        print(f"Finding game: '{game_name}' (with spaces: '{game_name_with_spaces}')")
        
        games_dirs = list(DIRECTORY.rglob('games'))
        print(f"Found {len(games_dirs)} games directories: {games_dirs}")
        for games_dir in games_dirs:
            if not games_dir.is_dir():
                continue
            for entry in games_dir.iterdir():
                if not entry.is_dir():
                    continue
                # Read metadata
                data = {}
                data_file = entry / 'data.json'
                if data_file.exists():
                    try:
                        with open(data_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                    except Exception:
                        data = {}
                
                name = data.get('name') or entry.name
                print(f"  Checking game: entry.name='{entry.name}', name='{name}'")
                # Check if name matches (with both hyphenated and original name)
                if name == game_name or entry.name == game_name or name == game_name_with_spaces or entry.name == game_name_with_spaces:
                    print(f"  ✓ Match found!")
                    # Construct URL
                    rel = entry.relative_to(DIRECTORY)
                    rel_parts = [urllib.parse.quote(p) for p in rel.parts]
                    index_file = entry / 'index.html'
                    if index_file.exists():
                        return '/' + '/'.join(rel_parts) + '/index.html'
                    else:
                        return '/' + '/'.join(rel_parts) + '/'
        print(f"  ✗ No match found for '{game_name}'")
        return None
    
    def serve_game_player(self, game_url, game_name):
        """Serve the game player HTML with the game URL embedded"""
        player_file = DIRECTORY / 'Game Launcher' / 'game-player.html'
        if not player_file.exists():
            self.send_error(404, "Game player not found")
            return
        
        try:
            with open(player_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Inject the game URL and name into the player page
            # Replace the URL parameter extraction with hardcoded values
            content = content.replace(
                "const gameUrl = urlParams.get('url');",
                f"const gameUrl = '{game_url}';"
            )
            content = content.replace(
                "const gameName = urlParams.get('name') || 'Game';",
                f"const gameName = '{game_name}';"
            )
            
            body = content.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_error(500, f"Error serving game player: {e}")

    def handle_api_games(self):
        # Search for any 'games' directories under the project; support moved folders
        games = []
        games_dirs = list(DIRECTORY.rglob('games'))

        print(f"handle_api_games: searching under {DIRECTORY}; found games dirs: {len(games_dirs)} -> {games_dirs}")
        for games_dir in games_dirs:
            print(f" scanning games_dir: {games_dir}")
            if not games_dir.is_dir():
                print("  not a directory, skipping", games_dir)
                continue
            for entry in sorted(games_dir.iterdir(), key=lambda p: p.name.lower()):
                print(f"  entry: {entry} (is_dir={entry.is_dir()})")
                if not entry.is_dir():
                    print("   skipping non-dir", entry)
                    continue
                # read metadata if present
                data = {}
                data_file = entry / 'data.json'
                if data_file.exists():
                    try:
                        with open(data_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                    except Exception:
                        # ignore malformed JSON and fall back to folder name
                        data = {}

                name = data.get('name') or entry.name
                description = data.get('description') or ''
                thumbnail = data.get('thumbnail') or ''
                categories = data.get('categories') or data.get('catagories') or {}
                if isinstance(categories, dict):
                    # Only include categories where the value is True
                    category_keys = [key for key, value in categories.items() if value is True]
                elif isinstance(categories, list):
                    category_keys = categories
                elif isinstance(categories, str):
                    category_keys = [categories]
                else:
                    category_keys = []

                # Construct URL by using the path relative to project root and URL-encoding each segment
                rel = entry.relative_to(DIRECTORY)
                rel_parts = [urllib.parse.quote(p) for p in rel.parts]
                # Prefer index.html if it exists, otherwise link to the folder root
                index_file = entry / 'index.html'
                if index_file.exists():
                    url = '/' + '/'.join(rel_parts) + '/index.html'
                else:
                    url = '/' + '/'.join(rel_parts) + '/'

                games.append({
                    'id': entry.name,
                    'name': name,
                    'description': description,
                    'thumbnail': thumbnail,
                    'url': url,
                    'categories': category_keys,
                    'version': data.get('version'),
                    'developer': data.get('developer'),
                    'release_date': data.get('release_date'),
                    # support several possible keys for release state/status
                    'state': data.get('state') or data.get('status') or data.get('release_state')
                })

        body = json.dumps(games, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)


def main():
    """Start the web server and open the browser"""
    
    # Change to the project root directory
    os.chdir(DIRECTORY)
    
    # Create the server
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 Server started successfully!")
        print(f"📂 Serving files from: {DIRECTORY}")
        
        # Open the website homepage
        home_path = '/website'
        print(f"🌐 Open your browser at: http://localhost:{PORT}{home_path}")
        print(f"⏹️  Press Ctrl+C to stop the server\n")
        
        # Open the browser automatically to the site's home
        webbrowser.open(f'http://localhost:{PORT}{home_path}')
        
        try:
            # Start serving
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped. Goodbye!")

if __name__ == "__main__":
    main()
