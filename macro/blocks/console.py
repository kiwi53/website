def output(params):
    """Output a message to the console with a specific level (log, warn, error)"""
    message = params.get('message', '')
    output_type = params.get('type', 'log')  # log, warn, or error
    
    # Format message based on type
    formatted_message = str(message)
    if output_type == 'warn':
        formatted_message = f"warning: {formatted_message}"
    elif output_type == 'error':
        formatted_message = f"error: {formatted_message}"
    
    # This will be handled by the JavaScript console
    # The executor should call addConsoleOutput(message, type)
    return {
        'action': 'console_output',
        'message': formatted_message,
        'type': output_type
    }


def output_colour(params):
    """Output a message to the console in a specific color (red, green, blue)"""
    message = params.get('message', '')
    output_type = params.get('type', 'red')  # red, green, or blue
    
    # This will be handled by the JavaScript console
    # The executor should call addConsoleOutput(message, colorType)
    return {
        'action': 'console_output',
        'message': str(message),
        'type': output_type
    }
