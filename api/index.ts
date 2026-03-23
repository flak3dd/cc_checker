/**
 * Vercel Serverless API — Express app wrapped for @vercel/node runtime.
 * 
 * Key differences from local backend/server.ts:
 * - Uses /tmp for file storage (ephemeral, persists across warm invocations)
 * - Process spawning (Playwright automation) is disabled — returns cloud-mode errors
 * - In-memory store supplements /tmp for hot data
 * - CLOUD_MODE flag lets the frontend adapt its UI
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const CLOUD_MODE = true;

// --- Paths (use /tmp on Vercel) ---
const DATA_DIR = '/tmp/data';
const SCREENSHOTS_DIR = '/tmp/screenshots';

const filePath = (name: string) => path.join(DATA_DIR, name);

const RESULTS_FILE = filePath('results.txt');
const CARDS_FILE = filePath('cards.txt');
const PLATES_FILE = filePath('plates.txt');
const LOG_FILE = filePath('wa_hits_log.txt');
const WA_CHECKOUT_LOG = filePath('wa_checkout_log.txt');
const WA_HITS_JSON = filePath('wa_hits.json');
const WA_HITS_FILE = filePath('wa_hits.txt');
const WA_CHECKOUT_RESULTS_JSON = filePath('wa_checkout_results.json');
const WA_PENDING_PAYMENT_FILE = filePath('wa_pending_payment.json');
const WA_SELECTED_CARD_FILE = filePath('wa_selected_card.json');
const WA_CHECKOUT_TERM_FILE = filePath('wa_checkout_term.json');
const CARFACTS_LOG = filePath('carfacts_log.txt');
const CARFACTS_RESULTS_JSON = filePath('carfacts_results.json');

// Ensure /tmp directories
[DATA_DIR, SCREENSHOTS_DIR, path.join(SCREENSHOTS_DIR, 'hits')].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// --- Middleware ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use('/screenshots', express.static(SCREENSHOTS_DIR));

const upload = multer({ storage: multer.memoryStorage() });

// --- Helpers ---
function safeRead(filepath: string, fallback = ''): string {
  try {
    return fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : fallback;
  } catch {
    return fallback;
  }
}

function safeReadJSON(filepath: string, fallback: any = []): any {
  try {
    return fs.existsSync(filepath) ? JSON.parse(fs.readFileSync(filepath, 'utf-8')) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(filepath: string, content: string) {
  try {
    fs.writeFileSync(filepath, content);
  } catch (e) {
    console.error(`Failed to write ${filepath}:`, e);
  }
}

function parseResultsFile() {
  const content = safeRead(RESULTS_FILE);
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
  const content = safeRead(RESULTS_FILE);

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
  return safeRead(CARDS_FILE).split('\n').filter(l => l.trim()).length;
}

/** Cloud-mode guard: returns error for process management endpoints */
function cloudModeError(res: Response, action: string) {
  return res.status(503).json({
    success: false,
    message: `${action} is not available in cloud mode. Run automation locally with start.sh`,
    cloud_mode: true,
  });
}

// ─── Health ─────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', cloud_mode: CLOUD_MODE, runtime: 'vercel' });
});

// ─── Status & Analytics ─────────────────────────────────────────
app.get('/api/status', (_req: Request, res: Response) => {
  const results = parseResultsFile();
  const remaining = countRemainingCards();
  res.json({
    is_running: false, // Always false in cloud mode
    remaining_cards: remaining,
    total_processed: results.length,
  });
});

app.get('/api/results', (_req: Request, res: Response) => {
  const runs = parseResultsGrouped();
  runs.reverse();
  res.json({ runs, total: parseResultsFile().length });
});

app.get('/api/analytics', (_req: Request, res: Response) => {
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

// ─── Upload ─────────────────────────────────────────────────────
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

    const existing = safeRead(CARDS_FILE);
    safeWrite(CARDS_FILE, existing + validLines.join('\n') + '\n');
    res.json({ success: true, message: `Uploaded ${validLines.length} cards`, count: validLines.length });
  } else if (target === 'wa_rego') {
    const validLines: string[] = [];
    const plateRegex = /^[A-Z0-9]{1,10}$/;
    for (const l of lines) {
      const parts = l.replace(/,/g, ' ').split(/\s+/);
      for (let p of parts) {
        p = p.trim().toUpperCase();
        if (plateRegex.test(p)) validLines.push(p);
      }
    }
    if (validLines.length === 0) return res.json({ success: false, message: 'No valid plates found' });

    const existing = safeRead(PLATES_FILE);
    safeWrite(PLATES_FILE, existing + validLines.join('\n') + '\n');
    res.json({ success: true, message: `Uploaded ${validLines.length} plates`, count: validLines.length });
  } else {
    res.status(400).json({ success: false, message: `Invalid target: ${target}` });
  }
});

// ─── Process Management (cloud-mode disabled) ───────────────────
app.post('/api/processing/start', (_req: Request, res: Response) => cloudModeError(res, 'CC Checker'));
app.post('/api/processing/stop', (_req: Request, res: Response) => cloudModeError(res, 'CC Checker'));
app.post('/api/plate-check/start', (_req: Request, res: Response) => cloudModeError(res, 'Plate Check'));
app.post('/api/plate-check/stop', (_req: Request, res: Response) => cloudModeError(res, 'Plate Check'));
app.post('/api/wa-checkout/start', (_req: Request, res: Response) => cloudModeError(res, 'WA Checkout'));
app.post('/api/wa-checkout/stop', (_req: Request, res: Response) => cloudModeError(res, 'WA Checkout'));
app.post('/api/carfacts/start', (_req: Request, res: Response) => cloudModeError(res, 'CarFacts'));
app.post('/api/carfacts/stop', (_req: Request, res: Response) => cloudModeError(res, 'CarFacts'));

// ─── Data Management (works in cloud) ───────────────────────────
app.post('/api/results/clear', (_req: Request, res: Response) => {
  safeWrite(RESULTS_FILE, '');
  res.json({ success: true, message: 'Results cleared' });
});

app.post('/api/rerun', (req: Request, res: Response) => {
  const { cards } = req.body;
  if (!cards || !Array.isArray(cards)) return res.status(400).json({ success: false, message: 'No cards provided' });

  const existing = safeRead(CARDS_FILE).split('\n').filter(l => l.trim());
  const newLines = cards.map((c: any) => `${c.card_number}|${c.mm}|${c.yy}|${c.cvv}`);
  safeWrite(CARDS_FILE, [...newLines, ...existing].join('\n') + '\n');
  res.json({ success: true, message: `Re-queued ${newLines.length} cards`, count: newLines.length });
});

// ─── Logs ───────────────────────────────────────────────────────
app.get('/api/logs/tail', (req: Request, res: Response) => {
  const file = req.query.file as string || 'wa';
  const linesCount = parseInt(req.query.lines as string) || 50;

  const pathMap: Record<string, string> = {
    'wa': LOG_FILE,
    'wa-checkout': WA_CHECKOUT_LOG,
    'results': RESULTS_FILE,
    'cc': filePath('cc_log.txt'),
    'carfacts': CARFACTS_LOG,
  };

  const target = pathMap[file];
  if (!target) return res.json({ lines: [] });

  const content = safeRead(target).split('\n');
  res.json({ lines: content.slice(-linesCount).map(l => l.trim()) });
});

// ─── Plate Check ────────────────────────────────────────────────
app.post('/api/plate-check/clear', (_req: Request, res: Response) => {
  safeWrite(LOG_FILE, '');
  safeWrite(WA_HITS_JSON, '[]');
  safeWrite(WA_HITS_FILE, '');
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

  const existing = safeRead(PLATES_FILE);
  safeWrite(PLATES_FILE, existing + generated.join('\n') + '\n');
  res.json({ success: true, message: `Generated ${count} plates`, count });
});

app.get('/api/plate-check/status', (_req: Request, res: Response) => {
  const hitsCount = safeReadJSON(WA_HITS_JSON, []).length;
  const pendingCount = safeRead(PLATES_FILE).split('\n').filter(l => l.trim()).length;

  res.json({
    is_running: false,
    hits_count: hitsCount,
    total_lines: hitsCount + pendingCount,
    pending_count: pendingCount,
  });
});

app.get('/api/plate-check/results', (_req: Request, res: Response) => {
  const content = safeRead(LOG_FILE);
  const lines = content.split('\n').filter(l => l.trim()).slice(-100);
  res.json({ results: lines });
});

// ─── WA Rego / Checkout ─────────────────────────────────────────
app.get('/api/wa-rego/hits', (_req: Request, res: Response) => {
  res.json(safeReadJSON(WA_HITS_JSON, []));
});

app.get('/api/wa-rego/checkout-results', (_req: Request, res: Response) => {
  res.json(safeReadJSON(WA_CHECKOUT_RESULTS_JSON, []));
});

app.post('/api/wa-checkout/clear', (_req: Request, res: Response) => {
  safeWrite(WA_CHECKOUT_LOG, '');
  safeWrite(WA_CHECKOUT_RESULTS_JSON, '[]');
  res.json({ success: true, message: 'WA Checkout logs and results cleared' });
});

app.post('/api/wa-checkout/set-term', (req: Request, res: Response) => {
  const { term } = req.body;
  if (![3, 6, 12].includes(term)) {
    return res.status(400).json({ success: false, message: 'Term must be 3, 6, or 12' });
  }
  safeWrite(WA_CHECKOUT_TERM_FILE, JSON.stringify({ term }));
  res.json({ success: true, message: `Term set to ${term} months` });
});

app.get('/api/wa-checkout/term', (_req: Request, res: Response) => {
  const data = safeReadJSON(WA_CHECKOUT_TERM_FILE, { term: 12 });
  res.json({ term: data.term || 12 });
});

app.get('/api/wa-checkout/status', (_req: Request, res: Response) => {
  const hitsCount = safeRead(WA_HITS_FILE).split('\n').filter(l => l.trim()).length;
  const pending_payment = safeReadJSON(WA_PENDING_PAYMENT_FILE, null);

  res.json({
    is_running: false,
    hits_to_process: hitsCount,
    pending_payment,
  });
});

app.post('/api/wa-checkout/select-card', (req: Request, res: Response) => {
  const cardData = req.body;
  if (!cardData || !cardData.card_number) {
    return res.status(400).json({ success: false, message: 'Invalid card data' });
  }
  safeWrite(WA_SELECTED_CARD_FILE, JSON.stringify(cardData));
  res.json({ success: true, message: 'Card selected for automation' });
});

// ─── CarFacts ───────────────────────────────────────────────────
app.get('/api/carfacts/status', (_req: Request, res: Response) => {
  const resultsCount = safeReadJSON(CARFACTS_RESULTS_JSON, []).length;
  const pendingPlates = safeRead(PLATES_FILE).split('\n').filter(l => l.trim()).length;
  res.json({ is_running: false, results_count: resultsCount, pending_plates: pendingPlates });
});

app.get('/api/carfacts/results', (_req: Request, res: Response) => {
  res.json(safeReadJSON(CARFACTS_RESULTS_JSON, []));
});

app.post('/api/carfacts/clear', (_req: Request, res: Response) => {
  safeWrite(CARFACTS_LOG, '');
  safeWrite(CARFACTS_RESULTS_JSON, '[]');
  res.json({ success: true, message: 'CarFacts logs and results cleared' });
});

// ─── Push Data (for local automation to push results to cloud) ──
app.post('/api/sync/push', (req: Request, res: Response) => {
  const { file, content, append } = req.body;
  if (!file || content === undefined) {
    return res.status(400).json({ success: false, message: 'file and content required' });
  }

  const allowedFiles = [
    'results.txt', 'wa_hits.json', 'wa_hits.txt', 'wa_checkout_results.json',
    'wa_hits_log.txt', 'wa_checkout_log.txt', 'cc_log.txt',
    'carfacts_results.json', 'carfacts_log.txt',
    'wa_pending_payment.json', 'wa_selected_card.json',
  ];

  if (!allowedFiles.includes(file)) {
    return res.status(400).json({ success: false, message: `File not allowed: ${file}` });
  }

  const targetPath = filePath(file);
  if (append) {
    const existing = safeRead(targetPath);
    safeWrite(targetPath, existing + content);
  } else {
    safeWrite(targetPath, typeof content === 'string' ? content : JSON.stringify(content));
  }

  res.json({ success: true, message: `Synced ${file}` });
});

app.get('/api/sync/pull', (req: Request, res: Response) => {
  const file = req.query.file as string;
  if (!file) return res.status(400).json({ success: false, message: 'file param required' });

  const allowedFiles = ['cards.txt', 'plates.txt', 'wa_selected_card.json', 'wa_checkout_term.json'];
  if (!allowedFiles.includes(file)) {
    return res.status(400).json({ success: false, message: `File not allowed: ${file}` });
  }

  res.json({ success: true, content: safeRead(filePath(file)) });
});

// ─── Export for Vercel ──────────────────────────────────────────
export default app;
