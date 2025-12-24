# Advanced Build Configuration for Macro Agent

This folder contains scripts to build the Macro Agent into a standalone executable.

## Quick Build

```bash
python build_exe.py
```

The executable will be created in `dist/MacroAgent.exe`

## What Gets Included

- ✓ macro_agent.py (main server)
- ✓ blocks/ folder (keyboard.py, mouse.py, control.py, operators.py)
- ✓ All JSON definitions
- ✓ All Python dependencies (Flask, keyboard, pyautogui, etc.)

## Build Options

### Standard Build (Recommended)
```bash
python build_exe.py
```
- Single EXE file
- ~15-25 MB size
- Shows console window
- Easy to distribute

### Silent Build (No Console)
Edit `build_exe.py` and change:
```python
"--console",  # Change to "--noconsole" or "--windowed"
```

### Add Custom Icon
1. Get a `.ico` file (e.g., `icon.ico`)
2. Add to build command:
```python
"--icon", "icon.ico",
```

### Directory Build (Faster startup)
Change `--onefile` to `--onedir` for:
- Faster execution
- Larger folder (not single file)
- Easier debugging

## Testing the Build

After building:

1. **Test locally:**
   ```bash
   dist\MacroAgent.exe
   ```

2. **Verify it starts:**
   - Should see "🤖 MACRO AGENT STARTED"
   - Should listen on localhost:9001

3. **Test from webpage:**
   - Open your macro page
   - Should see "🟢 Agent Connected"
   - Test keyboard/mouse blocks

## Troubleshooting

### "Missing module" errors
Add to build_exe.py:
```python
"--hidden-import", "module_name",
```

### "blocks folder not found"
The blocks folder is included automatically. If it fails:
```python
"--add-data", "blocks;blocks",  # Windows
"--add-data", "blocks:blocks",  # Mac/Linux
```

### Antivirus flags the EXE
- This is normal for PyInstaller executables
- Add exception in antivirus
- Or sign the executable (advanced)

### EXE size too large
1. Use UPX compression:
   ```bash
   pip install pyinstaller[encryption]
   ```
   Add to build: `--upx-dir=path/to/upx`

2. Exclude unused libraries:
   ```python
   "--exclude-module", "matplotlib",
   "--exclude-module", "numpy",
   ```

## Distribution

### For End Users:

**Option 1: Direct EXE**
1. Copy `MacroAgent.exe` to any location
2. Run it
3. Done!

**Option 2: ZIP Package**
Create a ZIP with:
- `MacroAgent.exe`
- `README.txt` (user instructions)
- Optional: `config.json` for settings

### For Developers:

Share the entire `Macro` folder:
- Users with Python: `python macro_agent.py`
- Users without: `MacroAgent.exe`

## Advanced: Auto-Update

To add auto-update capability:
1. Host latest version info on your server
2. Agent checks version on startup
3. Downloads update if available
4. Replaces itself and restarts

(Implementation not included - requires additional code)

## Security Notes

- Agent only listens on localhost (127.0.0.1)
- No remote connections accepted
- Blocks folder can be customized
- Consider adding password/token auth for production

## File Locations After Build

```
Macro/
  ├── macro_agent.py          (source)
  ├── build_exe.py            (build script)
  ├── blocks/                 (source modules)
  ├── build/                  (temp build files)
  ├── dist/
  │   └── MacroAgent.exe     (final executable)
  └── MacroAgent.spec         (PyInstaller spec file)
```

## Customizing the Build

Edit `MacroAgent.spec` (created after first build) for advanced options:
- Custom imports
- Runtime hooks
- Resource inclusion
- Build optimizations
