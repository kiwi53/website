# Macro Agent Setup Guide

## Quick Start (for users)

### Step 1: Install Python
1. Download Python 3.8+ from https://python.org
2. During installation, check "Add Python to PATH"

### Step 2: Install Required Packages
Open Command Prompt or PowerShell in the `Macro` folder and run:
```bash
pip install -r requirements.txt
```

### Step 3: Start the Agent
Double-click `start_agent.bat` or run:
```bash
python macro_agent.py
```

You should see:
```
🤖 MACRO AGENT STARTED
📡 Listening on: http://localhost:9001
```

### Step 4: Use the Webpage
1. Open your browser and go to your macro page
2. You should see "🟢 Agent Connected" in the header
3. Create macro blocks and run them!

---

## For Developers

### Testing Locally
1. Run the agent: `python macro_agent.py`
2. Run your web server: `python server.py`
3. Navigate to `http://localhost:8000/website/macro`

### Creating an Executable
To create a standalone `.exe` that users can run without Python:

```bash
# Install PyInstaller
pip install pyinstaller

# Create single executable
pyinstaller --onefile --name MacroAgent --icon=icon.ico macro_agent.py

# The executable will be in dist/MacroAgent.exe
```

### Packaging for Distribution
1. Build the executable (see above)
2. Create a ZIP file with:
   - `MacroAgent.exe`
   - `README_AGENT.md` (renamed to `README.txt`)
   - Optional: blocks folder if users need access to block definitions

### Security Notes
- The agent only listens on localhost (127.0.0.1)
- CORS is enabled for all origins - restrict this in production
- Consider adding authentication tokens for production use
- Some operations (keyboard/mouse) may require administrator privileges

### Customization
Edit `macro_agent.py` to:
- Change the port (default: 9001)
- Restrict CORS origins
- Add authentication
- Implement custom block types
- Add logging/monitoring

### Troubleshooting
- **Port in use**: Change PORT in macro_agent.py
- **Permission denied**: Run as administrator
- **Module not found**: Reinstall requirements.txt
- **Connection refused**: Check firewall settings
