"""
Build script to compile macro_agent.py into a standalone executable
Usage: python build_exe.py
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Build the Macro Agent executable"""
    
    print("=" * 60)
    print("MACRO AGENT BUILDER")
    print("=" * 60)
    print()
    
    # Check if PyInstaller is installed
    try:
        import PyInstaller
        print("✓ PyInstaller found")
    except ImportError:
        print("✗ PyInstaller not found. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("✓ PyInstaller installed")
    
    print()
    
    # Get paths
    script_dir = Path(__file__).parent
    agent_script = script_dir / "macro_agent.py"
    blocks_dir = script_dir / "blocks"
    output_dir = script_dir / "dist"
    
    if not agent_script.exists():
        print(f"✗ Error: {agent_script} not found!")
        return 1
    
    print(f"📄 Script: {agent_script}")
    print(f"📦 Blocks: {blocks_dir}")
    print(f"📂 Output: {output_dir}")
    print()
    
    # Build PyInstaller command
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",                          # Single executable
        "--name", "MacroAgent",               # Output name
        "--console",                          # Show console window
        "--add-data", f"{blocks_dir};blocks", # Include blocks folder
        "--hidden-import", "keyboard",        # Ensure keyboard is included
        "--hidden-import", "mouse",           # Ensure mouse is included
        "--hidden-import", "pyautogui",       # Ensure pyautogui is included
        "--hidden-import", "flask",           # Ensure flask is included
        "--hidden-import", "flask_cors",      # Ensure flask-cors is included
        "--clean",                            # Clean cache
        str(agent_script)
    ]
    
    print("🔨 Building executable...")
    print()
    print("Command:", " ".join(cmd))
    print()
    
    try:
        subprocess.check_call(cmd)
        print()
        print("=" * 60)
        print("✓ BUILD SUCCESSFUL!")
        print("=" * 60)
        print()
        print(f"📦 Executable location: {output_dir / 'MacroAgent.exe'}")
        print()
        print("To distribute:")
        print("  1. Copy MacroAgent.exe to any computer")
        print("  2. Run it (no Python required!)")
        print("  3. The agent will start on http://localhost:9001")
        print()
        return 0
        
    except subprocess.CalledProcessError as e:
        print()
        print("=" * 60)
        print("✗ BUILD FAILED!")
        print("=" * 60)
        print()
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
