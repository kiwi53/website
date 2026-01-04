"""Mouse category block handlers"""

import time
import pyautogui


def move(params):
    """Move mouse to specific coordinates"""
    x = int(params.get('X') or params.get('x', 0))
    y = int(params.get('Y') or params.get('y', 0))
    pyautogui.moveTo(x, y)
    return f"Moved mouse to ({x}, {y})"


def glide(params):
    """Glide mouse to coordinates over time"""
    x = int(params.get('X') or params.get('x', 0))
    y = int(params.get('Y') or params.get('y', 0))
    duration = float(params.get('TIME') or params.get('time', 1))
    pyautogui.moveTo(x, y, duration=duration)
    return f"Glided to ({x}, {y}) in {duration}s"


def scroll_mouse(params):
    """Scroll the mouse wheel"""
    direction = params.get('direction', 'up')
    amount = int(params.get('amount', 1))
    scroll_amount = amount if direction == 'up' else -amount
    pyautogui.scroll(scroll_amount)
    return f"Scrolled {direction} by {amount}"


def press_mouse(params):
    """Click a mouse button"""
    button = params.get('button', 'left')
    pyautogui.click(button=button)
    return f"Clicked {button} button"


def double_press_mouse(params):
    """Double-click a mouse button"""
    button = params.get('button', 'left')
    pyautogui.doubleClick(button=button)
    return f"Double-clicked {button} button"

