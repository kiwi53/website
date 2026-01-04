"""Operators category block handlers"""
import math
import random


def value(params):
    """Arithmetic operators"""
    value1 = float(params.get('value1', 0))
    operator = params.get('operator', '+')
    value2 = float(params.get('value2', 0))
    
    if operator == '+':
        result = value1 + value2
    elif operator == '-':
        result = value1 - value2
    elif operator == '*':
        result = value1 * value2
    elif operator == '/':
        result = value1 / value2 if value2 != 0 else 0
    elif operator == 'mod':
        result = value1 % value2 if value2 != 0 else 0
    elif operator == 'OR':
        result = int(value1) | int(value2)
    elif operator == 'AND':
        result = int(value1) & int(value2)
    elif operator == 'XOR':
        result = int(value1) ^ int(value2)
    elif operator == 'NAND':
        result = ~(int(value1) & int(value2))
    elif operator == 'NOR':
        result = ~(int(value1) | int(value2))
    else:
        result = 0
    
    return f"{value1} {operator} {value2} = {result}"


def bitwise_value(params):
    """Bitwise operators on integers"""
    value1 = int(params.get('value1', 0))
    operator = params.get('operator', 'OR')
    value2 = int(params.get('value2', 0))
    
    if operator == 'OR':
        result = value1 | value2
    elif operator == 'AND':
        result = value1 & value2
    elif operator == 'XOR':
        result = value1 ^ value2
    elif operator == 'NAND':
        result = ~(value1 & value2)
    elif operator == 'NOR':
        result = ~(value1 | value2)
    else:
        result = 0
    
    return f"{value1} {operator} {value2} = {result}"


def bitwise_boolean(params):
    """Boolean logical operators"""
    bool1_str = str(params.get('boolean1', 'True')).strip()
    boolean1 = bool1_str.lower() == 'true'
    
    operator = params.get('operator', 'OR')
    
    bool2_str = str(params.get('boolean2', 'False')).strip()
    boolean2 = bool2_str.lower() == 'true'
    
    if operator == '=':
        result = boolean1 == boolean2
    elif operator == '!=':
        result = boolean1 != boolean2
    elif operator == 'OR':
        result = boolean1 or boolean2
    elif operator == 'AND':
        result = boolean1 and boolean2
    elif operator == 'XOR':
        result = boolean1 ^ boolean2
    elif operator == 'NAND':
        result = not (boolean1 and boolean2)
    elif operator == 'NOR':
        result = not (boolean1 or boolean2)
    else:
        result = False
    
    return f"{boolean1} {operator} {boolean2} = {result}"


def boolean(params):
    """Boolean value"""
    state = params.get('state', 'True')
    return f"Boolean: {state}"


# New functions for missing blocks
def not_boolean(params):
    """Negate a boolean"""
    bool_str = str(params.get('boolean', 'True')).strip()
    boolean_val = bool_str.lower() == 'true'
    result = not boolean_val
    return f"not {boolean_val} = {result}"


def not_value(params):
    """Bitwise NOT on a value"""
    value = int(params.get('value', 1))
    result = ~value
    return f"not {value} = {result}"


def stuff(params):
    """Mathematical functions"""
    operator = params.get('operator', 'round')
    value = float(params.get('value', 0))
    
    try:
        if operator == 'round':
            result = round(value)
        elif operator == 'abs':
            result = abs(value)
        elif operator == 'floor':
            result = math.floor(value)
        elif operator == 'ceiling':
            result = math.ceil(value)
        elif operator == 'sqrt':
            result = math.sqrt(value)
        elif operator == 'sin':
            result = math.sin(value)
        elif operator == 'cos':
            result = math.cos(value)
        elif operator == 'tan':
            result = math.tan(value)
        elif operator == 'asin':
            result = math.asin(value)
        elif operator == 'acos':
            result = math.acos(value)
        elif operator == 'atan':
            result = math.atan(value)
        elif operator == 'In':
            result = math.log(value)
        elif operator == 'log':
            result = math.log10(value)
        elif operator == 'e^':
            result = math.exp(value)
        elif operator == '10^':
            result = 10 ** value
        else:
            result = value
        return f"{operator} of {value} = {result}"
    except Exception as e:
        return f"Error: {str(e)}"


def join(params):
    """Join two strings"""
    text1 = str(params.get('text1', ''))
    text2 = str(params.get('text2', ''))
    return text1 + text2


def letter(params):
    """Get letter at position from text"""
    position = int(params.get('position', 1))
    text = str(params.get('text', ''))
    
    # Convert to 0-based index
    index = position - 1
    if 0 <= index < len(text):
        return text[index]
    return ""


def length(params):
    """Get length of text"""
    text = str(params.get('text', ''))
    return len(text)


def contain(params):
    """Check if text contains substring"""
    text = str(params.get('text', ''))
    contains = str(params.get('contains', ''))
    result = contains in text
    return result
