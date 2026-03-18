"""
FastAPI server that reads results.txt and cards.txt to serve live data
to the CC Checker mobile/web app.

Run: uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import json
from datetime import datetime, timezone
from fastapi import FastAPI, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="CC Checker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths — server runs from runner/ directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_FILE = os.path.join(BASE_DIR, "..", "results.txt")
CARDS_FILE = os.path.join(BASE_DIR, "..", "cards.txt")
WIDGET_DATA_FILE = os.path.join(BASE_DIR, "..", "widget_data.json")


# --- Helpers ---

def parse_results_file():
    """Parse results.txt into structured result dicts.
    Format: cc|mm|yy|cvv|STATUS|screenshot.png
    Lines without STATUS are unprocessed card data (skipped).
    """
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
                results.append({
                    "card_number": parts[0],
                    "mm": parts[1],
                    "yy": parts[2],
                    "cvv": parts[3],
                    "status": parts[4],
                    "screenshot_path": parts[5],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    return results


def parse_results_grouped():
    """Parse results.txt and group consecutive processed lines into runs.
    Unprocessed lines (< 6 parts) act as natural run separators.
    Returns list of runs, each run is a list of result dicts.
    """
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
                current_run.append({
                    "card_number": parts[0],
                    "mm": parts[1],
                    "yy": parts[2],
                    "cvv": parts[3],
                    "status": parts[4],
                    "screenshot_path": parts[5],
                })
            else:
                # Unprocessed line = run boundary
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


def get_widget_data() -> dict:
    """Read widget_data.json for is_running state."""
    if not os.path.exists(WIDGET_DATA_FILE):
        return {"is_running": False}
    try:
        with open(WIDGET_DATA_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {"is_running": False}


# --- API Endpoints ---

@app.get("/api/status")
def get_status():
    """Current processing status."""
    results = parse_results_file()
    remaining = count_remaining_cards()
    widget = get_widget_data()

    return {
        "is_running": widget.get("is_running", False),
        "remaining_cards": remaining,
        "total_processed": len(results),
    }


@app.get("/api/results")
def get_results():
    """Results grouped by run — newest run first."""
    runs = parse_results_grouped()
    # Reverse so newest runs come first
    runs.reverse()

    all_results = parse_results_file()
    total = len(all_results)

    return {
        "runs": runs,
        "total": total,
    }


@app.get("/api/analytics")
def get_analytics():
    """Aggregated analytics from results."""
    results = parse_results_file()
    widget = get_widget_data()

    success_count = sum(1 for r in results if r["status"] == "SUCCESS")
    fail_count = sum(1 for r in results if r["status"] in ("FAIL", "ERROR_PREPAYMENT"))
    total_count = len(results)
    success_rate = (success_count / total_count * 100) if total_count > 0 else 0

    response = {
        "success_count": success_count,
        "fail_count": fail_count,
        "total_count": total_count,
        "success_rate": round(success_rate, 1),
    }

    # Include current card if running
    if widget.get("is_running", False) and results:
        response["current_card"] = results[-1]  # Last result from original order

    return response


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a card file (.txt or .csv) and append to cards.txt."""
    content = await file.read()
    lines = content.decode("utf-8").strip().splitlines()
    valid_lines = [l.strip() for l in lines if l.strip() and "|" in l]

    with open(CARDS_FILE, "a") as f:
        for line in valid_lines:
            f.write(line + "\n")

    return {
        "success": True,
        "message": f"Uploaded {file.filename} with {len(valid_lines)} cards",
        "count": len(valid_lines),
    }


@app.post("/api/processing/start")
def start_processing():
    """Mark processing as running in widget_data.json."""
    from update_widget import update_widget_data
    update_widget_data(
        cards_file=CARDS_FILE,
        results_file=RESULTS_FILE,
        output_file=WIDGET_DATA_FILE,
        is_running=True,
    )
    return {"success": True, "message": "Processing started"}


@app.post("/api/processing/stop")
def stop_processing():
    """Mark processing as stopped in widget_data.json."""
    from update_widget import update_widget_data
    update_widget_data(
        cards_file=CARDS_FILE,
        results_file=RESULTS_FILE,
        output_file=WIDGET_DATA_FILE,
        is_running=False,
    )
    return {"success": True, "message": "Processing stopped"}


class RerunRequest(BaseModel):
    cards: list  # list of {card_number, mm, yy, cvv}


@app.post("/api/rerun")
def rerun_cards(req: RerunRequest):
    """Re-queue cards from a run back into cards.txt for reprocessing."""
    with open(CARDS_FILE, "a") as f:
        for card in req.cards:
            line = f"{card['card_number']}|{card['mm']}|{card['yy']}|{card['cvv']}"
            f.write(line + "\n")
    return {
        "success": True,
        "message": f"Re-queued {len(req.cards)} cards",
        "count": len(req.cards),
    }


@app.post("/api/results/clear")
def clear_results():
    """Clear all results from results.txt (remove only processed lines)."""
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, "w") as f:
            f.write("")
    return {"success": True, "message": "Results cleared"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
