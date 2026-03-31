import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 8000;

// Paths
const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const SCREENSHOTS_DIR = path.join(BASE_DIR, 'screenshots');
const RESULTS_FILE = path.join(DATA_DIR, 'results.txt');
const CARDS_FILE = path.join(DATA_DIR, 'cards.txt');
const PLATES_FILE = path.join(DATA_DIR, 'plates.txt');
const LOG_FILE = path.join(DATA_DIR, 'wa_hits_log.txt');
const WA_CHECKOUT_LOG = path.join(DATA_DIR, 'wa_checkout_log.txt');
const WA_HITS_JSON = path.join(DATA_DIR, 'wa_hits.json');
const WA_HITS_FILE = path.join(DATA_DIR, 'wa_hits.txt');
const WA_CHECKOUT_RESULTS_JSON = path.join(DATA_DIR, 'wa_checkout_results.json');
const WA_PENDING_PAYMENT_FILE = path.join(DATA_DIR, 'wa_pending_payment.json');
const WA_SELECTED_CARD_FILE = path.join(DATA_DIR, 'wa_selected_card.json');
const WA_CHECKOUT_TERM_FILE = path.join(DATA_DIR, 'wa_checkout_term.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/screenshots', express.static(SCREENSHOTS_DIR));

// Process Management — all null on startup, nothing auto-starts
let ccCheckProcess: ChildProcess | null = null;
let plateCheckProcess: ChildProcess | null = null;
let plateCheckoutProcess: ChildProcess | null = null;

// Clean up any stale state files from previous runs on startup
const STALE_FILES = [
  path.join(DATA_DIR, 'wa_pending_payment.json'),
  path.join(DATA_DIR, 'wa_selected_card.json'),
];
STALE_FILES.forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });

const upload = multer({ storage: multer.memoryStorage() });

// --- Helpers ---

function parseResultsFile() {
  if (!fs.existsSync(RESULTS_FILE)) return [];
  const content = fs.readFileSync(RESULTS_FILE, 'utf-8');
  return content.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const parts = line.split('|');
      if (parts.length >= 6) {
        return {
          card_number: parts[0],
          mm: parts[1],
          yy: parts[2],
          cvv: parts[3],
          status: parts[4],
          screenshot_path: parts[5],
          timestamp: parts[6] || new Date().toISOString(),
        };
      }
      return null;
    })
    .filter(Boolean);
}

function parseResultsGrouped() {
  const runs: any[][] = [];
  let currentRun: any[] = [];
  if (!fs.existsSync(RESULTS_FILE)) return runs;

  const content = fs.readFileSync(RESULTS_FILE, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('|');
    if (parts.length >= 6) {
      currentRun.push({
        card_number: parts[0],
        mm: parts[1],
        yy: parts[2],
        cvv: parts[3],
        status: parts[4],
        screenshot_path: parts[5],
        timestamp: parts[6] || new Date().toISOString(),
      });
    } else {
      if (currentRun.length > 0) {
        runs.push(currentRun);
        currentRun = [];
      }
    }
  });
  if (currentRun.length > 0) runs.push(currentRun);
  return runs;
}

function countRemainingCards() {
  if (!fs.existsSync(CARDS_FILE)) return 0;
  return fs.readFileSync(CARDS_FILE, 'utf-8').split('\n').filter(l => l.trim()).length;
}

function killProcessGroup(proc: ChildProcess | null) {
  if (proc && proc.pid) {
    try {
      process.kill(-proc.pid, 'SIGTERM');
    } catch {
      // Process group kill failed, try direct kill
      try { proc.kill('SIGTERM'); } catch {}
    }
    // Also try SIGKILL after a short delay as fallback
    setTimeout(() => {
      try { process.kill(-proc.pid!, 'SIGKILL'); } catch {}
      try { proc.kill('SIGKILL'); } catch {}
    }, 2000);
    return true;
  }
  return false;
}

/** Check if a PID is still alive */
function isProcessAlive(proc: ChildProcess | null): boolean {
  if (!proc || !proc.pid) return false;
  try {
    process.kill(proc.pid, 0); // signal 0 = just check existence
    return true;
  } catch {
    return false;
  }
}

// --- Endpoints ---

app.get('/api/status', (req: Request, res: Response) => {
  const isRunning = isProcessAlive(ccCheckProcess);
  const results = parseResultsFile();
  const remaining = countRemainingCards();

  res.json({
    is_running: isRunning,
    remaining_cards: remaining,
    total_processed: results.length,
  });
});

app.get('/api/results', (req: Request, res: Response) => {
  const runs = parseResultsGrouped();
  runs.reverse();
  const allResults = parseResultsFile();
  res.json({
    runs,
    total: allResults.length,
  });
});

app.get('/api/results/cc', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const allResults = parseResultsFile();
  const start = (page - 1) * limit;
  const results = allResults.slice(start, start + limit);
  res.json({
    results,
    total: allResults.length,
    hasMore: start + limit < allResults.length
  });
});

app.get('/api/results/wa', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  let waResults: any[] = [];
  if (fs.existsSync(WA_CHECKOUT_RESULTS_JSON)) {
    try {
      waResults = JSON.parse(fs.readFileSync(WA_CHECKOUT_RESULTS_JSON, 'utf-8'));
    } catch {}
  }
  
  const start = (page - 1) * limit;
  const results = waResults.slice(start, start + limit);
  res.json({
    results,
    total: waResults.length,
    hasMore: start + limit < waResults.length
  });
});

app.get('/api/analytics', (req: Request, res: Response) => {
  const results = parseResultsFile() as any[];
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failCount = results.filter(r => ['FAIL', 'ERROR_PREPAYMENT'].includes(r.status)).length;
  const totalCount = results.length;
  const successRate = totalCount > 0 ? (successCount / totalCount * 100) : 0;

  res.json({
    success_count: successCount,
    fail_count: failCount,
    total_count: totalCount,
    success_rate: Math.round(successRate * 10) / 10,
  });
});

app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  const target = req.query.target as string || 'cc';
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const content = req.file.buffer.toString('utf-8');
  const lines = content.trim().split(/\r?\n/);

  if (target === 'cc') {
    const validLines: string[] = [];
    for (const l of lines) {
      const trimmed = l.trim();
      if (!trimmed) continue;
      const parts = trimmed.split('|');
      if (parts.length >= 4 && parts.slice(0, 4).every(p => /^\d+$/.test(p.trim()))) {
        validLines.push(trimmed);
      }
    }
    if (validLines.length === 0) return res.json({ success: false, message: 'No valid card data found (format: CC|MM|YY|CVV)' });

    fs.appendFileSync(CARDS_FILE, validLines.join('\n') + '\n');
    res.json({ success: true, message: `Uploaded ${validLines.length} cards`, count: validLines.length });
  } else if (target === 'wa_rego') {
    const validLines: string[] = [];
    const plateRegex = /^[A-Z0-9]{1,10}$/;
    for (const l of lines) {
      const parts = l.replace(/,/g, ' ').split(/\s+/);
      for (let p of parts) {
        p = p.trim().toUpperCase();
        if (plateRegex.test(p)) {
          validLines.push(p);
        }
      }
    }
    if (validLines.length === 0) return res.json({ success: false, message: 'No valid plates found' });

    fs.appendFileSync(PLATES_FILE, validLines.join('\n') + '\n');
    res.json({ success: true, message: `Uploaded ${validLines.length} plates`, count: validLines.length });
  } else {
    res.status(400).json({ success: false, message: `Invalid target: ${target}` });
  }
});

app.post('/api/processing/start', (req: Request, res: Response) => {
  if (isProcessAlive(ccCheckProcess)) {
    return res.json({ success: false, message: 'CC Check is already running' });
  }

  const scriptPath = path.join(BASE_DIR, 'automation', 'cc_checker', 'check.ts');
  try {
    ccCheckProcess = spawn('npx', ['tsx', scriptPath], {
      cwd: BASE_DIR,
      detached: true,
      stdio: 'ignore'
    });
    ccCheckProcess.unref(); // Allow the parent to exit independently if needed
    res.json({ success: true, message: 'Processing started', pid: ccCheckProcess.pid });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `Failed to start: ${e.message}` });
  }
});

app.post('/api/processing/stop', (req: Request, res: Response) => {
  if (isProcessAlive(ccCheckProcess)) {
    killProcessGroup(ccCheckProcess);
    ccCheckProcess = null;
    return res.json({ success: true, message: 'Processing stopped' });
  }
  ccCheckProcess = null;
  res.json({ success: false, message: 'Processing is not running' });
});

app.post('/api/results/clear', (req: Request, res: Response) => {
  fs.writeFileSync(RESULTS_FILE, '');
  res.json({ success: true, message: 'Results cleared' });
});

app.post('/api/rerun', (req: Request, res: Response) => {
  const { cards } = req.body;
  if (!cards || !Array.isArray(cards)) return res.status(400).json({ success: false, message: 'No cards provided' });

  let existing: string[] = [];
  if (fs.existsSync(CARDS_FILE)) {
    existing = fs.readFileSync(CARDS_FILE, 'utf-8').split('\n').filter(l => l.trim());
  }

  const newLines = cards.map((c: any) => `${c.card_number}|${c.mm}|${c.yy}|${c.cvv}`);
  fs.writeFileSync(CARDS_FILE, [...newLines, ...existing].join('\n') + '\n');
  res.json({ success: true, message: `Re-queued ${newLines.length} cards`, count: newLines.length });
});

app.get('/api/logs/tail', (req: Request, res: Response) => {
  const file = req.query.file as string || 'wa';
  const linesCount = parseInt(req.query.lines as string) || 50;

  const pathMap: Record<string, string> = {
    'wa': LOG_FILE,
    'wa-checkout': WA_CHECKOUT_LOG,
    'results': RESULTS_FILE,
    'cc': path.join(DATA_DIR, 'cc_log.txt'),
  };

  const target = pathMap[file];
  if (!target || !fs.existsSync(target)) return res.json({ lines: [] });

  try {
    const content = fs.readFileSync(target, 'utf-8').split('\n');
    res.json({ lines: content.slice(-linesCount).map(l => l.trim()) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// --- Plate Check Endpoints ---

app.post('/api/plate-check/start', (req: Request, res: Response) => {
  if (isProcessAlive(plateCheckProcess)) {
    return res.json({ success: false, message: 'Plate check is already running' });
  }

  const scriptPath = path.join(BASE_DIR, 'automation', 'wa_rego', 'check.ts');
  try {
    plateCheckProcess = spawn('npx', ['tsx', scriptPath], {
      cwd: BASE_DIR,
      detached: true,
      stdio: 'ignore'
    });
    plateCheckProcess.unref();
    res.json({ success: true, message: 'Plate check started', pid: plateCheckProcess.pid });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `Failed to start: ${e.message}` });
  }
});

app.post('/api/plate-check/stop', (req: Request, res: Response) => {
  if (isProcessAlive(plateCheckProcess)) {
    killProcessGroup(plateCheckProcess);
    plateCheckProcess = null;
    return res.json({ success: true, message: 'Plate check stopped' });
  }
  plateCheckProcess = null;
  res.json({ success: false, message: 'Plate check is not running' });
});

app.post('/api/plate-check/clear', (req: Request, res: Response) => {
  fs.writeFileSync(LOG_FILE, '');
  if (fs.existsSync(WA_HITS_JSON)) fs.writeFileSync(WA_HITS_JSON, '[]');
  if (fs.existsSync(WA_HITS_FILE)) fs.writeFileSync(WA_HITS_FILE, '');
  res.json({ success: true, message: 'Plate logs and hits cleared' });
});

app.post('/api/plate-check/generate', (req: Request, res: Response) => {
  const count = parseInt(req.query.count as string) || 100;
  const generated: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';

  for (let i = 0; i < count; i++) {
    let l = '';
    for (let j = 0; j < 3; j++) l += chars.charAt(Math.floor(Math.random() * chars.length));
    let d = '';
    for (let j = 0; j < 3; j++) d += digits.charAt(Math.floor(Math.random() * digits.length));
    generated.push(`1${l}${d}`);
  }

  fs.appendFileSync(PLATES_FILE, generated.join('\n') + '\n');
  res.json({ success: true, message: `Generated ${count} plates`, count });
});

app.get('/api/plate-check/status', (req: Request, res: Response) => {
  const isRunning = isProcessAlive(plateCheckProcess);
  if (!isRunning && plateCheckProcess) plateCheckProcess = null;

  let hitsCount = 0;
  if (fs.existsSync(WA_HITS_JSON)) {
    try { hitsCount = JSON.parse(fs.readFileSync(WA_HITS_JSON, 'utf-8')).length; } catch {}
  }
  const pendingCount = fs.existsSync(PLATES_FILE)
    ? fs.readFileSync(PLATES_FILE, 'utf-8').split('\n').filter(l => l.trim()).length
    : 0;

  res.json({
    is_running: isRunning,
    hits_count: hitsCount,
    total_lines: hitsCount + pendingCount,
    pending_count: pendingCount,
  });
});

app.get('/api/plate-check/results', (req: Request, res: Response) => {
  if (!fs.existsSync(LOG_FILE)) return res.json({ results: [] });
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim()).slice(-100);
    res.json({ results: lines });
  } catch {
    res.json({ results: [] });
  }
});

// --- Plate Checkout Endpoints ---

app.post('/api/wa-checkout/start', (req: Request, res: Response) => {
  if (isProcessAlive(plateCheckoutProcess)) {
    return res.json({ success: false, message: 'WA Checkout is already running' });
  }

  const scriptPath = path.join(BASE_DIR, 'automation', 'wa_rego', 'checkout.ts');
  try {
    plateCheckoutProcess = spawn('npx', ['tsx', scriptPath], {
      cwd: BASE_DIR,
      detached: true,
      stdio: 'ignore'
    });
    plateCheckoutProcess.unref();
    res.json({ success: true, message: 'WA Checkout started', pid: plateCheckoutProcess.pid });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `Failed to start: ${e.message}` });
  }
});

app.post('/api/wa-checkout/stop', (req: Request, res: Response) => {
  if (isProcessAlive(plateCheckoutProcess)) {
    killProcessGroup(plateCheckoutProcess);
    plateCheckoutProcess = null;
    return res.json({ success: true, message: 'WA Checkout stopped' });
  }
  plateCheckoutProcess = null;
  res.json({ success: false, message: 'WA Checkout is not running' });
});

app.post('/api/wa-checkout/clear', (req: Request, res: Response) => {
  fs.writeFileSync(WA_CHECKOUT_LOG, '');
  if (fs.existsSync(WA_CHECKOUT_RESULTS_JSON)) fs.writeFileSync(WA_CHECKOUT_RESULTS_JSON, '[]');
  res.json({ success: true, message: 'WA Checkout logs and results cleared' });
});

app.get('/api/wa-rego/hits', (req: Request, res: Response) => {
  if (!fs.existsSync(WA_HITS_JSON)) return res.json([]);
  try {
    const hits = JSON.parse(fs.readFileSync(WA_HITS_JSON, 'utf-8'));
    res.json(hits);
  } catch {
    res.json([]);
  }
});

app.get('/api/wa-rego/checkout-results', (req: Request, res: Response) => {
  if (!fs.existsSync(WA_CHECKOUT_RESULTS_JSON)) return res.json([]);
  try {
    const results = JSON.parse(fs.readFileSync(WA_CHECKOUT_RESULTS_JSON, 'utf-8'));
    res.json(results);
  } catch {
    res.json([]);
  }
});

app.post('/api/wa-checkout/set-term', (req: Request, res: Response) => {
  const { term } = req.body;
  if (![3, 6, 12].includes(term)) {
    return res.status(400).json({ success: false, message: 'Term must be 3, 6, or 12' });
  }
  fs.writeFileSync(WA_CHECKOUT_TERM_FILE, JSON.stringify({ term }));
  res.json({ success: true, message: `Term set to ${term} months` });
});

app.get('/api/wa-checkout/term', (req: Request, res: Response) => {
  let term = 12;
  if (fs.existsSync(WA_CHECKOUT_TERM_FILE)) {
    try { term = JSON.parse(fs.readFileSync(WA_CHECKOUT_TERM_FILE, 'utf-8')).term; } catch {}
  }
  res.json({ term });
});

app.get('/api/wa-checkout/status', (req: Request, res: Response) => {
  const isRunning = isProcessAlive(plateCheckoutProcess);
  if (!isRunning && plateCheckoutProcess) plateCheckoutProcess = null;
  const hitsCount = fs.existsSync(WA_HITS_FILE) ? fs.readFileSync(WA_HITS_FILE, 'utf-8').split('\n').filter(l => l.trim()).length : 0;
  
  let pending_payment = null;
  if (fs.existsSync(WA_PENDING_PAYMENT_FILE)) {
    try {
      pending_payment = JSON.parse(fs.readFileSync(WA_PENDING_PAYMENT_FILE, 'utf-8'));
    } catch {}
  }

  res.json({ 
    is_running: isRunning, 
    hits_to_process: hitsCount,
    pending_payment: pending_payment
  });
});

app.post('/api/wa-checkout/select-card', (req: Request, res: Response) => {
  const cardData = req.body;
  if (!cardData || !cardData.card_number) {
    return res.status(400).json({ success: false, message: 'Invalid card data' });
  }

  fs.writeFileSync(WA_SELECTED_CARD_FILE, JSON.stringify(cardData));
  res.json({ success: true, message: 'Card selected for automation' });
});

app.listen(PORT as number, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
