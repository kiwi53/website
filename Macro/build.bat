@echo off
echo ========================================
echo   Macro Agent - Build to EXE
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)
echo Done!
echo.

echo [2/3] Building executable...
python build_exe.py
if errorlevel 1 (
    echo Error: Build failed
    pause
    exit /b 1
)
echo.

echo [3/3] Testing executable...
if exist "dist\MacroAgent.exe" (
    echo Success! Executable created: dist\MacroAgent.exe
    echo.
    echo You can now distribute this file to users.
    echo No Python installation required to run it!
    echo.
) else (
    echo Error: Executable not found
    pause
    exit /b 1
)

echo ========================================
echo   Build Complete!
echo ========================================
pause
