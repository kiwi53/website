from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

def get_volume_interface():
    """Get the audio endpoint volume interface"""
    devices = AudioUtilities.GetSpeakers()
    interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)  # type: ignore
    volume = cast(interface, POINTER(IAudioEndpointVolume))
    return volume

def set_volume(params):
    """Set system volume to a specific level (0-100)"""
    try:
        volume_level = int(params.get('volume', 25))
        # Clamp between 0 and 100
        volume_level = max(0, min(100, volume_level))
        
        volume = get_volume_interface()
        # Convert 0-100 to 0.0-1.0
        volume.SetMasterVolumeLevelScalar(volume_level / 100.0, None)  # type: ignore
        
        return f"Volume set to {volume_level}%"
    except Exception as e:
        return f"Error setting volume: {str(e)}"

def change_volume(params):
    """Change system volume by a relative amount"""
    try:
        change_amount = int(params.get('volume', 5))
        
        volume = get_volume_interface()
        # Get current volume (0.0-1.0)
        current = volume.GetMasterVolumeLevelScalar()  # type: ignore
        # Convert to 0-100, add change, clamp, convert back
        new_level = max(0, min(100, (current * 100) + change_amount))
        volume.SetMasterVolumeLevelScalar(new_level / 100.0, None)  # type: ignore
        
        return f"Volume changed by {change_amount:+d}% to {int(new_level)}%"
    except Exception as e:
        return f"Error changing volume: {str(e)}"
