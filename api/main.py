"""
FastAPI server that reads results.txt and cards.txt to serve live data
to the CC Checker mobile/web app.

Run: uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import json
import subprocess
import sys
import signal
from datetime import datetime, timezone
from fastapi import FastAPI, Query, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="CC Checker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths — server runs from api/ directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
SCREENSHOTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "screenshots"))
RESULTS_FILE = os.path.join(DATA_DIR, "results.txt")
CARDS_FILE = os.path.join(DATA_DIR, "cards.txt")
PLATES_FILE = os.path.join(DATA_DIR, "plates.txt")
LOG_FILE = os.path.join(DATA_DIR, "wa_hits_log.txt")

if not os.path.exists(SCREENSHOTS_DIR):
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

# Static files for screenshots
app.mount("/screenshots", StaticFiles(directory=SCREENSHOTS_DIR), name="screenshots")

# Global process states
cc_check_process = None
plate_check_process = None

class CardItem(BaseModel):
    card_number: str
    mm: str
    yy: str
    cvv: str

class RerunRequest(BaseModel):
    cards: List[CardItem]

# --- Helpers ---

def parse_results_file():
    """Parse results.txt into structured result dicts."""
    results = []
    if not os.path.exists(RESULTS_FILE):
        return results

    with open(RESULTS_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("|")
            if len(parts) >= 6:
                timestamp = parts[6] if len(parts) >= 7 else datetime.now(timezone.utc).isoformat()
                results.append({
                    "card_number": parts[0],
                    "mm": parts[1],
                    "yy": parts[2],
                    "cvv": parts[3],
                    "status": parts[4],
                    "screenshot_path": parts[5],
                    "timestamp": timestamp,
                })
    return results


def parse_results_grouped():
    """Parse results.txt and group consecutive processed lines into runs."""
    runs = []
    current_run = []
    if not os.path.exists(RESULTS_FILE):
        return runs

    with open(RESULTS_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("|")
            if len(parts) >= 6:
                timestamp = parts[6] if len(parts) >= 7 else datetime.now(timezone.utc).isoformat()
                current_run.append({
                    "card_number": parts[0],
                    "mm": parts[1],
                    "yy": parts[2],
                    "cvv": parts[3],
                    "status": parts[4],
                    "screenshot_path": parts[5],
                    "timestamp": timestamp,
                })
            else:
                if current_run:
                    runs.append(current_run)
                    current_run = []
    if current_run:
        runs.append(current_run)
    return runs


def count_remaining_cards() -> int:
    """Count non-empty lines in cards.txt."""
    if not os.path.exists(CARDS_FILE):
        return 0
    with open(CARDS_FILE, "r") as f:
        return len([line for line in f if line.strip()])


# --- API Endpoints ---

@app.get("/api/status")
def get_status():
    """Current processing status."""
    global cc_check_process
    is_running = cc_check_process is not None and cc_check_process.poll() is None
    results = parse_results_file()
    remaining = count_remaining_cards()

    return {
        "is_running": is_running,
        "remaining_cards": remaining,
        "total_processed": len(results),
    }


@app.get("/api/results")
def get_results():
    """Results grouped by run — newest run first."""
    runs = parse_results_grouped()
    runs.reverse()
    all_results = parse_results_file()
    return {
        "runs": runs,
        "total": len(all_results),
    }


@app.get("/api/analytics")
def get_analytics():
    """Aggregated analytics from results."""
    results = parse_results_file()
    success_count = sum(1 for r in results if r["status"] == "SUCCESS")
    fail_count = sum(1 for r in results if r["status"] in ("FAIL", "ERROR_PREPAYMENT"))
    total_count = len(results)
    success_rate = (success_count / total_count * 100) if total_count > 0 else 0

    return {
        "success_count": success_count,
        "fail_count": fail_count,
        "total_count": total_count,
        "success_rate": round(success_rate, 1),
    }


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), target: str = Query("cc")):
    """Upload a card or plate file with validation."""
    content = await file.read()
    try:
        lines = content.decode("utf-8").strip().splitlines()
    except UnicodeDecodeError:
        return {"success": False, "message": "File must be UTF-8 encoded text"}
    
    if target == "cc":
        # Expecting CC|MM|YY|CVV
        valid_lines = []
        for l in lines:
            l = l.strip()
            if not l: continue
            parts = l.split("|")
            if len(parts) >= 4 and all(p.strip().isdigit() for p in parts[:4]):
                valid_lines.append(l)
        
        if not valid_lines:
            return {"success": False, "message": "No valid card data found (format: CC|MM|YY|CVV)"}
            
        with open(CARDS_FILE, "a") as f:
            for line in valid_lines:
                f.write(line + "\n")
        msg = f"Uploaded {len(valid_lines)} cards"
        count = len(valid_lines)
    elif target == "wa_rego":
        # Expecting plates (alphanumeric, 1-7 chars)
        valid_lines = []
        import re
        plate_regex = re.compile(r'^[A-Z0-9]{1,10}$')
        for l in lines:
            parts = l.replace(",", " ").split()
            for p in parts:
                p = p.strip().upper()
                if plate_regex.match(p):
                    valid_lines.append(p)
        
        if not valid_lines:
            return {"success": False, "message": "No valid plates found"}
            
        with open(PLATES_FILE, "a") as f:
            for line in valid_lines:
                f.write(line + "\n")
        msg = f"Uploaded {len(valid_lines)} plates"
        count = len(valid_lines)
    else:
        return {"success": False, "message": f"Invalid target: {target}"}

    return {"success": True, "message": msg, "count": count}


@app.post("/api/processing/start")
def start_processing():
    """Start the CC check process."""
    global cc_check_process
    if cc_check_process and cc_check_process.poll() is None:
        return {"success": False, "message": "CC Check is already running"}

    script_path = os.path.join(BASE_DIR, "..", "automation", "cc_checker", "start.py")
    try:
        # Use os.setsid to create a new process group for reliable killing
        cc_check_process = subprocess.Popen(
            [sys.executable, script_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            preexec_fn=os.setsid
        )
        return {"success": True, "message": "Processing started", "pid": cc_check_process.pid}
    except Exception as e:
        return {"success": False, "message": f"Failed to start: {str(e)}"}


@app.post("/api/processing/stop")
def stop_processing():
    """Stop the CC check process."""
    global cc_check_process
    if cc_check_process and cc_check_process.poll() is None:
        try:
            # Kill the entire process group
            os.killpg(os.getpgid(cc_check_process.pid), signal.SIGTERM)
            cc_check_process = None
            return {"success": True, "message": "Processing stopped"}
        except Exception as e:
            return {"success": False, "message": f"Stop failed: {str(e)}"}
    return {"success": False, "message": "Processing is not running"}


@app.post("/api/results/clear")
def clear_results():
    """Clear results.txt."""
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, "w") as f:
            f.write("")
    return {"success": True, "message": "Results cleared"}


@app.post("/api/rerun")
def rerun_cards(request: RerunRequest):
    """Re-queue specific cards to the top of cards.txt."""
    if not request.cards:
        return {"success": False, "message": "No cards provided"}
    
    existing = []
    if os.path.exists(CARDS_FILE):
        with open(CARDS_FILE, "r") as f:
            existing = [l for l in f if l.strip()]
    
    new_lines = []
    for c in request.cards:
        new_lines.append(f"{c.card_number}|{c.mm}|{c.yy}|{c.cvv}")
    
    with open(CARDS_FILE, "w") as f:
        for l in new_lines + existing:
            f.write(l.strip() + "\n")
            
    return {"success": True, "message": f"Re-queued {len(new_lines)} cards", "count": len(new_lines)}


@app.get("/api/logs/tail")
def tail_logs(file: str = Query("wa"), lines: int = Query(50)):
    """Tail last N lines of a log file."""
    path_map = {
        "wa": LOG_FILE,
        "results": RESULTS_FILE,
        "cc": os.path.join(DATA_DIR, "cc_log.txt") # Example
    }
    
    target = path_map.get(file)
    if not target or not os.path.exists(target):
        return {"lines": []}
    
    try:
        with open(target, "r") as f:
            all_lines = f.readlines()
            return {"lines": [l.strip() for l in all_lines[-lines:]]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# --- Plate Check Endpoints ---

@app.post("/api/plate-check/start")
def start_plate_check():
    """Start the TypeScript plate-check script."""
    global plate_check_process
    if plate_check_process and plate_check_process.poll() is None:
        return {"success": False, "message": "Plate check is already running"}

    script_path = os.path.join(BASE_DIR, "..", "automation", "wa_rego", "check.ts")
    root_dir = os.path.join(BASE_DIR, "..")
    
    try:
        plate_check_process = subprocess.Popen(
            ["npx", "tsx", script_path],
            cwd=root_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            preexec_fn=os.setsid
        )
        return {"success": True, "message": "Plate check started", "pid": plate_check_process.pid}
    except Exception as e:
        return {"success": False, "message": f"Failed to start: {str(e)}"}


@app.post("/api/plate-check/stop")
def stop_plate_check():
    """Stop the TypeScript plate-check script."""
    global plate_check_process
    if plate_check_process and plate_check_process.poll() is None:
        try:
            os.killpg(os.getpgid(plate_check_process.pid), signal.SIGTERM)
            plate_check_process = None
            return {"success": True, "message": "Plate check stopped"}
        except Exception as e:
            return {"success": False, "message": f"Stop failed: {str(e)}"}
    return {"success": False, "message": "Plate check is not running"}


@app.post("/api/plate-check/clear")
def clear_plate_results():
    """Clear plate results log."""
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w") as f:
            f.write("")
    return {"success": True, "message": "Plate logs cleared"}


@app.post("/api/plate-check/generate")
def generate_plates(count: int = Query(100)):
    """Auto-generate random plates and append to plates.txt."""
    import random
    import string
    
    generated = []
    for _ in range(count):
        letters = "".join(random.choices(string.ascii_uppercase, k=3))
        digits = "".join(random.choices(string.digits, k=3))
        generated.append(f"1{letters}{digits}")
    
    with open(PLATES_FILE, "a") as f:
        for plate in generated:
            f.write(plate + "\n")
            
    return {
        "success": True, 
        "message": f"Generated {count} plates",
        "count": count
    }


@app.get("/api/plate-check/status")
def get_plate_check_status():
    """Check plate-check status."""
    global plate_check_process
    is_running = plate_check_process is not None and plate_check_process.poll() is None
    
    results = []
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("Start"):
                    results.append(line)

    pending_count = 0
    if os.path.exists(PLATES_FILE):
        with open(PLATES_FILE, "r") as f:
            pending_count = len([l for l in f if l.strip()])

    return {
        "is_running": is_running,
        "hits_count": len([r for r in results if "[HIT" in r]),
        "total_lines": len(results),
        "pending_count": pending_count
    }


@app.get("/api/plate-check/results")
def get_plate_check_results():
    """Fetch plate results."""
    if not os.path.exists(LOG_FILE):
        return {"results": []}
    
    results = []
    with open(LOG_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("Start"):
                results.append(line)
    
    return {"results": results[::-1]}
