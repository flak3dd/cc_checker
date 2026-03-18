import json
import os
import sys

def update_widget_data(cards_file="cards.txt", results_file="results.txt", output_file="widget_data.json", is_running=None):
    """
    Updates the JSON data source for the macOS widget.
    """
    # Count remaining cards
    remaining = 0
    if os.path.exists(cards_file):
        with open(cards_file, 'r') as f:
            remaining = len([line for line in f if line.strip()])
            
    # Get last result
    last_result = "None"
    last_status = "N/A"
    if os.path.exists(results_file):
        with open(results_file, 'r') as f:
            lines = [line.strip() for line in f if line.strip() and not line.startswith("#")]
            if lines:
                last_line = lines[-1]
                # Format: cc|mm|yy|cvv|STATUS|screenshot.png
                parts = last_line.split("|")
                if len(parts) >= 6:
                    card_info = parts[0][-4:] # Last 4 of CC
                    last_status = parts[4]
                    last_result = f"*{card_info}"
                    
    # Maintain is_running if not specified
    if is_running is None:
        if os.path.exists(output_file):
            try:
                with open(output_file, 'r') as f:
                    old_data = json.load(f)
                    is_running = old_data.get("is_running", False)
            except:
                is_running = False
        else:
            is_running = False

    data = {
        "remaining_cards": remaining,
        "last_result_card": last_result,
        "last_result_status": last_status,
        "is_running": is_running
    }
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=4)

if __name__ == "__main__":
    is_running_arg = None
    if "--running" in sys.argv:
        is_running_arg = True
    elif "--stopped" in sys.argv:
        is_running_arg = False
        
    update_widget_data(is_running=is_running_arg)
