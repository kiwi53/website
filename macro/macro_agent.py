from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import sys
import os
from pathlib import Path
import warnings

# Suppress NVIDIA virtual camera warnings
warnings.filterwarnings('ignore', category=UserWarning)
os.environ['OPENCV_VIDEOIO_PRIORITY_MSMF'] = '0'
os.environ['OPENCV_VIDEOIO_DEBUG'] = '0'

import mss
import mss.tools
import cv2
import numpy as np
from PIL import Image
import io
import threading
import time

# Suppress OpenCV warnings
cv2.setLogLevel(0)

# Add blocks directory to path
BLOCKS_DIR = Path(__file__).parent / 'blocks'
sys.path.insert(0, str(BLOCKS_DIR))

# Dynamically load all block category modules
block_modules = {}
block_category_map = {}

print("\n" + "=" * 60)
print("Loading block modules...")
print("=" * 60)

# Load all Python modules from blocks directory
for py_file in BLOCKS_DIR.glob('*.py'):
    if py_file.name.startswith('_'):
        continue  # Skip __init__.py and other private files
    
    module_name = py_file.stem
    try:
        module = __import__(module_name)
        block_modules[module_name] = module
        print(f"✓ Loaded {module_name} module")
    except Exception as e:
        print(f"✗ Failed to load {module_name}: {e}")

# Build block_category_map by reading JSON files
print("\nBuilding block category map...")
for json_file in BLOCKS_DIR.glob('*.json'):
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        category_name = data.get('name')
        blocks = data.get('blocks', [])
        
        if category_name and blocks:
            for block in blocks:
                block_name = block.get('name')
                if block_name:
                    block_category_map[block_name] = category_name
            
            print(f"✓ Mapped {len(blocks)} blocks from {json_file.name} to '{category_name}'")
    except Exception as e:
        print(f"✗ Failed to parse {json_file.name}: {e}")

print(f"\n✓ Total blocks registered: {len(block_category_map)}")
print(f"✓ Total modules loaded: {len(block_modules)}")
print("=" * 60 + "\n")

app = Flask(__name__)
# Enable CORS for all domains (you can restrict this to your domain later)
CORS(app, resources={r"/*": {"origins": "*"}})

# Load block definitions
def load_block_definitions():
    """Load all block JSON definitions from blocks directory"""
    blocks = {}
    
    # Automatically load all JSON files from blocks directory
    for json_path in BLOCKS_DIR.glob('*.json'):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                blocks.update(data)
            print(f"✓ Loaded block definitions from {json_path.name}")
        except Exception as e:
            print(f"✗ Error loading {json_path.name}: {e}")
    
    return blocks

BLOCK_DEFINITIONS = load_block_definitions()

# Display capture state
current_capture_source = None
capture_lock = threading.Lock()

def get_display_sources():
    """Get all available display sources (screens, windows, cameras)"""
    sources = {
        'screens': [],
        'windows': [],
        'cameras': []
    }
    
    # Get screens using mss
    try:
        with mss.mss() as sct:
            for i, monitor in enumerate(sct.monitors[1:], 1):  # Skip monitor 0 (all monitors)
                sources['screens'].append({
                    'id': f'screen-{i}',
                    'name': f'Screen {i}',
                    'width': monitor['width'],
                    'height': monitor['height']
                })
    except Exception as e:
        print(f"Error getting screens: {e}")
    
    # Get windows (platform-specific)
    try:
        if sys.platform == 'win32':
            import win32gui
            import win32process
            import win32con
            
            def enum_windows_callback(hwnd, windows):
                if win32gui.IsWindowVisible(hwnd) and win32gui.GetWindowText(hwnd):
                    # Skip certain system windows
                    title = win32gui.GetWindowText(hwnd)
                    if title and len(title) > 0:
                        try:
                            _, pid = win32process.GetWindowThreadProcessId(hwnd)
                            windows.append({
                                'id': f'window-{hwnd}',
                                'name': title,
                                'hwnd': hwnd
                            })
                        except:
                            pass
                return True
            
            windows_list = []
            win32gui.EnumWindows(enum_windows_callback, windows_list)
            sources['windows'] = windows_list[:50]  # Limit to 50 windows
    except Exception as e:
        print(f"Error getting windows: {e}")
    
    # Get cameras
    try:
        for i in range(5):  # Check first 5 camera indices
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                sources['cameras'].append({
                    'id': f'camera-{i}',
                    'name': f'Camera {i}'
                })
                cap.release()
    except Exception as e:
        print(f"Error getting cameras: {e}")
    
    return sources

def capture_frame(source_id):
    """Capture a single frame from the specified source"""
    try:
        if source_id.startswith('screen-'):
            # Capture screen
            screen_num = int(source_id.split('-')[1])
            with mss.mss() as sct:
                monitor = sct.monitors[screen_num]
                screenshot = sct.grab(monitor)
                img = Image.frombytes('RGB', screenshot.size, screenshot.rgb)
                return img
        
        elif source_id.startswith('window-'):
            # Capture window (Windows only)
            if sys.platform == 'win32':
                import win32gui
                import win32ui
                from ctypes import windll
                
                hwnd = int(source_id.split('-')[1])
                
                # Get window dimensions
                left, top, right, bottom = win32gui.GetWindowRect(hwnd)
                width = right - left
                height = bottom - top
                
                # Get window device context
                hwndDC = win32gui.GetWindowDC(hwnd)
                mfcDC = win32ui.CreateDCFromHandle(hwndDC)
                saveDC = mfcDC.CreateCompatibleDC()
                
                # Create bitmap
                saveBitMap = win32ui.CreateBitmap()
                saveBitMap.CreateCompatibleBitmap(mfcDC, width, height)
                saveDC.SelectObject(saveBitMap)
                
                # Capture window
                result = windll.user32.PrintWindow(hwnd, saveDC.GetSafeHdc(), 3)
                
                if result:
                    bmpinfo = saveBitMap.GetInfo()
                    bmpstr = saveBitMap.GetBitmapBits(True)
                    
                    img = Image.frombuffer(
                        'RGB',
                        (bmpinfo['bmWidth'], bmpinfo['bmHeight']),
                        bmpstr, 'raw', 'BGRX', 0, 1
                    )
                else:
                    img = None
                
                # Cleanup
                win32gui.DeleteObject(saveBitMap.GetHandle())
                saveDC.DeleteDC()
                mfcDC.DeleteDC()
                win32gui.ReleaseDC(hwnd, hwndDC)
                
                return img
        
        elif source_id.startswith('camera-'):
            # Capture from camera
            camera_num = int(source_id.split('-')[1])
            cap = cv2.VideoCapture(camera_num)
            if cap.isOpened():
                ret, frame = cap.read()
                cap.release()
                if ret:
                    # Convert BGR to RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    img = Image.fromarray(frame_rgb)
                    return img
    
    except Exception as e:
        print(f"Error capturing frame: {e}")
    
    return None

def generate_stream():
    """Generate MJPEG stream from current capture source"""
    global current_capture_source
    
    while True:
        with capture_lock:
            if not current_capture_source:
                time.sleep(0.1)
                continue
            
            img = capture_frame(current_capture_source)
            
            if img:
                # Resize for streaming (max 640x480)
                img.thumbnail((640, 480), Image.Resampling.LANCZOS)
                
                # Convert to JPEG
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85)
                frame_bytes = buffer.getvalue()
                
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            else:
                time.sleep(0.1)

@app.route('/display/sources', methods=['GET'])
def get_sources():
    """Get all available display sources"""
    try:
        sources = get_display_sources()
        return jsonify(sources)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/display/set-source', methods=['POST'])
def set_source():
    """Set the current capture source"""
    global current_capture_source
    
    try:
        data = request.get_json()
        source_id = data.get('source_id')
        
        if not source_id:
            return jsonify({'error': 'No source_id provided'}), 400
        
        with capture_lock:
            current_capture_source = source_id
        
        return jsonify({
            'success': True,
            'source': source_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/display/stream')
def stream():
    """Stream video from current source"""
    return Response(
        generate_stream(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@app.route('/status', methods=['GET'])
def status():
    """Check if agent is running"""
    return jsonify({
        'status': 'running',
        'version': '1.0.0',
        'blocks_loaded': len(BLOCK_DEFINITIONS)
    })

@app.route('/blocks', methods=['GET'])
def get_blocks():
    """Return available block definitions"""
    return jsonify(BLOCK_DEFINITIONS)

@app.route('/execute', methods=['POST'])
def execute_command():
    """Execute a macro command"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        block_type = data.get('type')
        block_id = data.get('id')
        params = data.get('params', {})
        
        print(f"Executing: {block_type} (ID: {block_id}) with params: {params}")
        
        # Execute the command based on block type
        result = execute_block(block_type, params)
        
        return jsonify({
            'success': True,
            'result': result,
            'block_id': block_id
        })
        
    except Exception as e:
        print(f"Error executing command: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/execute-sequence', methods=['POST'])
def execute_sequence():
    """Execute a sequence of macro blocks"""
    try:
        data = request.get_json()
        blocks = data.get('blocks', [])
        
        if not blocks:
            return jsonify({'error': 'No blocks provided'}), 400
        
        results = []
        for block in blocks:
            try:
                block_type = block.get('type')
                params = block.get('params', {})
                result = execute_block(block_type, params)
                results.append({
                    'success': True,
                    'result': result,
                    'block_id': block.get('id')
                })
            except Exception as e:
                results.append({
                    'success': False,
                    'error': str(e),
                    'block_id': block.get('id')
                })
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        print(f"Error executing sequence: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def execute_block(block_type, params):
    """Execute a single block based on its type by calling the appropriate module function"""
    
    # Debug: print all params received
    print(f"Block type: {block_type}")
    print(f"Params received: {params}")
    
    # Get the category for this block type from the dynamically built map
    category = block_category_map.get(block_type)
    
    if category and category in block_modules:
        # Get the function from the module
        # Handle special cases where Python reserved words are used
        func_name = block_type
        if block_type == 'if':
            func_name = 'if_block'
        elif block_type == 'while':
            func_name = 'while_block'
        
        func = getattr(block_modules[category], func_name, None)
        if func:
            try:
                result = func(params)
                print(f"✓ Executed: {result}")
                return result
            except Exception as e:
                error_msg = f"Error executing {block_type}: {str(e)}"
                print(f"✗ {error_msg}")
                return error_msg
        else:
            return f"Function {func_name} not found in {category} module"
    
    # Operators blocks (usually client-side)
    if block_type.startswith('operator_'):
        return "Operator block (client-side)"
    
    # Unknown block type
    return f"Unknown block type: {block_type}"

@app.route('/shutdown', methods=['POST'])
def shutdown():
    """Shutdown the agent"""
    print("Shutting down agent...")
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()
    return jsonify({'message': 'Agent shutting down...'})

def main():
    """Start the agent server"""
    PORT = 9001
    print("=" * 60)
    print("🤖 MACRO AGENT STARTED")
    print("=" * 60)
    print(f"📡 Listening on: http://localhost:{PORT}")
    print(f"📦 Blocks loaded: {len(BLOCK_DEFINITIONS)}")
    print(f"🌐 CORS enabled for all origins")
    print(f"⏹️  Press Ctrl+C to stop")
    print("=" * 60)
    print()
    
    # Start the server
    app.run(host='127.0.0.1', port=PORT, debug=False)

if __name__ == '__main__':
    main()
