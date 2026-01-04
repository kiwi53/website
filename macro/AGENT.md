# Macro Agent - Local Controller

## What is this?
This is a local agent that runs on your computer and allows the Macro webpage to control your keyboard, mouse, and other system functions.

## Setup Instructions

### 1. Install Python
- Download Python from https://python.org (Python 3.8+)
- Make sure "Add Python to PATH" is checked during installation

### 2. Install Dependencies
Open Command Prompt or PowerShell in this folder and run:
```bash
pip install -r requirements.txt
```

### 3. Run the Agent
Double-click `start_agent.bat` or run:
```bash
python macro_agent.py
```

You should see:
```
🤖 MACRO AGENT STARTED
📡 Listening on: http://localhost:9001
```

### 4. Use the Webpage
- Keep the agent running
- Open your macro webpage (can be on any server)
- The webpage will automatically connect to your local agent
- Create and run macros!

## Security Notes
- The agent only accepts connections from localhost (your computer)
- Close the agent when not in use
- Only run macros you trust

## Troubleshooting

**Port already in use?**
- Close any other programs using port 9001
- Or edit `macro_agent.py` to use a different port

**Webpage can't connect?**
- Make sure the agent is running
- Check if firewall is blocking port 9001
- Verify the webpage is trying to connect to `http://localhost:9001`

**Commands not working?**
- Run Command Prompt/PowerShell as Administrator
- Some keyboard/mouse functions require elevated privileges

## Creating an Executable (Optional)
To create a standalone .exe file:
```bash
pip install pyinstaller
pyinstaller --onefile --name MacroAgent macro_agent.py
```
The .exe will be in the `dist` folder.
