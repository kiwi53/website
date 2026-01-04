"""Keyboard category block handlers"""

import time
import keyboard
import pyautogui


def press_key(params):
    """Press and release a single key"""
    key = params.get('key', '')
    keyboard.press_and_release(key)
    return f"Pressed key: {key}"


def press_key_for(params):
    """Hold a key for a specified duration"""
    key = params.get('key', '')
    duration = float(params.get('time', 1))
    keyboard.press(key)
    time.sleep(duration)
    keyboard.release(key)
    return f"Held key {key} for {duration}s"


def type_string(params):
    """Type a string of text"""
    text = params.get('text', '')
    keyboard.write(text)
    return f"Typed: {text}"


def press_key_with_modifier(params):
    """Press a key with a modifier (ctrl, shift, alt, etc.)"""
    key = params.get('key', '')
    modifier = params.get('modifier', 'ctrl')
    keyboard.press_and_release(f'{modifier}+{key}')
    return f"Pressed {modifier}+{key}"


def hold_key_with_modifier(params):
    """Hold a key with modifier for a duration"""
    key = params.get('key', '')
    modifier = params.get('modifier', 'ctrl')
    duration = float(params.get('duration', 1))
    keyboard.press(modifier)
    keyboard.press(key)
    time.sleep(duration)
    keyboard.release(key)
    keyboard.release(modifier)
    return f"Held {modifier}+{key} for {duration}s"


def wait_for_key(params):
    """Wait for a specific key to be pressed"""
    key = params.get('key', '')
    keyboard.wait(key)
    return f"Waited for key: {key}"


def wait_any_key(params):
    """Wait for any key to be pressed"""
    keyboard.wait()
    return "Waited for any key"

