import random
import string

def calculate_checksum(vin_base):
    """Calculates the VIN checksum (position 9)."""
    weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
    values = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
        'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
    }
    
    total = 0
    for i, char in enumerate(vin_base):
        total += values[char] * weights[i]
    
    remainder = total % 11
    return 'X' if remainder == 10 else str(remainder)

def generate_vin():
    """Generates a legitimate 17-character VIN with valid checksum."""
    chars = [c for c in string.ascii_uppercase + string.digits if c not in ('I', 'O', 'Q')]
    
    # 1-3: WMI (World Manufacturer Identifier)
    # Using '6H8' for Holden Australia as a common example
    wmi = "6H8"
    
    # 4-8: VDS (Vehicle Descriptor Section)
    vds = ''.join(random.choice(chars) for _ in range(5))
    
    # 10: Model Year (using 'R' for 2024, 'S' for 2025, etc.)
    model_year = random.choice("RSTUVWXYZ") 
    
    # 11: Plant Code
    plant_code = random.choice(chars)
    
    # 12-17: VIS (Vehicle Identifier Section - sequential numbers)
    vis = ''.join(random.choice(string.digits) for _ in range(6))
    
    # Construct base VIN (position 9 is a placeholder)
    vin_base = wmi + vds + '0' + model_year + plant_code + vis
    
    # Calculate and insert checksum at position 9
    check_digit = calculate_checksum(vin_base)
    vin = vin_base[:8] + check_digit + vin_base[9:]
    
    return vin

if __name__ == "__main__":
    for _ in range(10):
        print(generate_vin())
