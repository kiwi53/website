import time


def start(params):
    return "Start block (handled by client)"


def wait(params):
    duration = float(params.get('duration', 1))
    time.sleep(duration)
    return f"Waited {duration}s"


def repeat(params):
    times = params.get('times', 1)
    return f"Repeat {times} times (handled by client)"


def repeat_forever(params):
    return "Repeat forever (handled by client)"


def if_block(params):
    condition = params.get('condition', 'True')
    return f"If {condition} (handled by client)"


def while_block(params):
    condition = params.get('condition', 'True')
    return f"While {condition} (handled by client)"

