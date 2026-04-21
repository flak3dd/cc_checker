import express, { Request, Response } from 'express';
import postgres from 'postgres';
import cors from 'cors';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import morgan from 'morgan';
import * as BlobUtils from './blob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Parse port from command line arguments (--port XXX) or environment variable
let portArg = 8000;
const portIdx = process.argv.indexOf('--port');
if (portIdx !== -1 && process.argv[portIdx + 1]) {
  portArg = parseInt(process.argv[portIdx + 1], 10);
}

// Railway compatibility: Map DATABASE_URL to POSTGRES_URL if needed
if (process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : portArg;
const USE_DB = process.env.VERCEL === '1' || !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL;
const DISABLE_AUTOMATION = process.env.VERCEL === '1'; // Automation is only disabled on serverless (Vercel)
const CLOUD_MODE = USE_DB; // Backwards compatibility for the rest of the file

let sql: any;
if (USE_DB) {
  try {
    const client = postgres(process.env.POSTGRES_URL || process.env.DATABASE_URL!);
    sql = (client as any).sql;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    sql = undefined;
  }
} else {
  sql = undefined;
}

// Database Initialization
async function initDb() {
  if (!sql) return;
  try {
    // wa_hits table
    await sql`CREATE TABLE IF NOT EXISTS wa_hits (
      id SERIAL PRIMARY KEY,
      plate TEXT,
      status TEXT,
      screenshot_path TEXT,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`;

    // wa_checkout_results table
    await sql`CREATE TABLE IF NOT EXISTS wa_checkout_results (
      id SERIAL PRIMARY KEY,
      plate TEXT,
      status TEXT,
      amount TEXT,
      reference TEXT,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`;

    // Logs tables
    const logTables = ['logs_wa', 'logs_wa_checkout', 'logs_cc', 'logs_gateway2'];
    for (const table of logTables) {
      await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (
        id SERIAL PRIMARY KEY,
        message TEXT,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`);
    }

    // gateway2_results
    await sql`CREATE TABLE IF NOT EXISTS gateway2_results (
      id SERIAL PRIMARY KEY,
      card_number TEXT,
      mm TEXT,
      yy TEXT,
      cvv TEXT,
      status TEXT,
      screenshot_path TEXT,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`;

    // json state tables
    const stateTables = ['pending_payment', 'selected_card', 'checkout_term'];
    for (const table of stateTables) {
       // use a single row for state
       if (table === 'checkout_term') {
         await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (
           id SERIAL PRIMARY KEY,
           term INTEGER,
           updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
         )`);
       } else {
         await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (
           id SERIAL PRIMARY KEY,
           data JSONB,
           updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
         )`);
       }
    }

    // plates and cards for queueing
    await sql`CREATE TABLE IF NOT EXISTS plates (
      id SERIAL PRIMARY KEY,
      plate TEXT UNIQUE
    )`;

    await sql`CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      card_number TEXT,
      mm TEXT,
      yy TEXT,
      cvv TEXT
    )`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

if (USE_DB) {
  initDb();
}

// Paths
const BASE_DIR = path.resolve(__dirname, '../');
const DATA_DIR = path.join(BASE_DIR, 'data');
const SCREENSHOTS_DIR = path.join(BASE_DIR, 'screenshots');
const HOSTED_PAGES_DIR = path.join(BASE_DIR, 'src/hosted-pages');
const HOSTED_PAGES_SCREENSHOTS_DIR = path.join(SCREENSHOTS_DIR, 'hosted-pages');
const DIST_DIR = path.join(BASE_DIR, 'dist');
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
const GATEWAY2_LOG_FILE = path.join(DATA_DIR, 'gateway2_log.txt');
const GATEWAY2_RESULTS_FILE = path.join(DATA_DIR, 'gateway2_results.txt');

// Ensure directories exist (only if not on Vercel)
if (process.env.VERCEL !== '1') {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// No schema init for Blob

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Custom screenshot handler for Vercel Blob support
app.get('/screenshots/:folder/:filename', async (req, res) => {
  const { folder, filename } = req.params;
  const localPath = path.join(SCREENSHOTS_DIR, folder, filename);

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  if (CLOUD_MODE) {
    try {
      const blobPath = `screenshots/${folder}/${filename}`;
      const url = await BlobUtils.getBlobUrl(blobPath);
      if (url) {
        return res.redirect(url);
      }
    } catch (e) {
      console.error('Error fetching screenshot from blob:', e);
    }
  }

  res.status(404).send('Screenshot not found');
});

// For top-level screenshots
app.get('/screenshots/:filename', async (req, res) => {
  const { filename } = req.params;
  const localPath = path.join(SCREENSHOTS_DIR, filename);

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  if (CLOUD_MODE) {
    try {
      const blobPath = `screenshots/${filename}`;
      const url = await BlobUtils.getBlobUrl(blobPath);
      if (url) {
        return res.redirect(url);
      }
    } catch (e) {
      console.error('Error fetching screenshot from blob:', e);
    }
  }

  res.status(404).send('Screenshot not found');
});

app.use('/screenshots', express.static(SCREENSHOTS_DIR));
app.use('/pages', express.static(HOSTED_PAGES_DIR));

app.get('/api/hosted-pages', (req, res) => {
  try {
    const files = fs.readdirSync(HOSTED_PAGES_DIR)
      .filter(file => file.endsWith('.html'));
    
    const pages = files.map(file => {
      const name = path.parse(file).name;
      const screenshotName = `${name}.png`;
      const screenshotPath = path.join(HOSTED_PAGES_SCREENSHOTS_DIR, screenshotName);
      
      return {
        id: name,
        name: name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        url: `/pages/${file}`,
        screenshot_url: fs.existsSync(screenshotPath) 
          ? `/screenshots/hosted-pages/${screenshotName}`
          : `https://via.placeholder.com/400x300?text=${encodeURIComponent(name)}`
      };
    });
    
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list hosted pages' });
  }
});

// Serve Expo web build in production/cloud mode
if (fs.existsSync(DIST_DIR)) {
app.use(express.static(DIST_DIR));
}

// No schema init needed for Blob

// Process Management — all null on startup, nothing auto-starts
let ccCheckProcess: ChildProcess | null = null;
let plateCheckProcess: ChildProcess | null = null;
let plateCheckoutProcess: ChildProcess | null = null;
let gateway2Process: ChildProcess | null = null;

// Clean up any stale state files from previous runs on startup
const STALE_FILES = [
  path.join(DATA_DIR, 'wa_pending_payment.json'),
  path.join(DATA_DIR, 'wa_selected_card.json'),
];
STALE_FILES.forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });

const upload = multer({ storage: multer.memoryStorage() });

// --- DB Helpers ---
async function getResults() {
  if (CLOUD_MODE) {
    const resultsStr = await BlobUtils.getBlobText('db/results.json');
    if (!resultsStr) return [];
    const results = JSON.parse(resultsStr);
    return results.map((r: any) => ({
      id: r.id,
      card_number: r.card_number,
      mm: r.mm,
      yy: r.yy,
      cvv: r.cvv,
      status: r.status,
      screenshot_path: r.screenshot_path,
      screenshot_url: r.screenshot_path ? `/screenshots/${r.screenshot_path}` : null,
      timestamp: r.timestamp,
    }));
  }
  return parseResultsFile();
}

async function getResultsGrouped(): Promise<any[][]> {
  if (CLOUD_MODE) {
    const results = await getResults();
    const chunkSize = 20;
    const runs: any[][] = [];
    for (let i = 0; i < results.length; i += chunkSize) {
      runs.push(results.slice(i, i + chunkSize));
    }
    return runs.reverse();
  }
  return parseResultsGrouped();
}

async function countCards() {
  if (CLOUD_MODE) {
    const cardsStr = await BlobUtils.getBlobText('db/cards.json');
    if (!cardsStr) return 0;
    const cards = JSON.parse(cardsStr);
    return cards.length;
  }
  return countRemainingCards();
}

async function countPlates() {
  if (sql) {
    try {
      const result = await sql`SELECT COUNT(*)::integer FROM plates`;
      return (Array.from(result)[0] as any)?.count ?? 0;
    } catch (error) {
      console.error('Error counting plates:', error);
      return 0;
    }
  }
  if (!fs.existsSync(PLATES_FILE)) return 0;
  return fs.readFileSync(PLATES_FILE, 'utf-8').split('\n').filter(l => l.trim()).length;
}

async function countWaHits() {
  if (sql) {
    try {
      const result = await sql`SELECT COUNT(*)::integer FROM wa_hits`;
      return (Array.from(result)[0] as any)?.count ?? 0;
    } catch (error) {
      console.error('Error counting wa_hits:', error);
      return 0;
    }
  }
  if (!fs.existsSync(WA_HITS_FILE)) return 0;
  return fs.readFileSync(WA_HITS_FILE, 'utf-8').split('\n').filter(l => l.trim()).length;
}

async function getWaHits() {
  if (CLOUD_MODE) {
    const { rows } = await sql`SELECT * FROM wa_hits ORDER BY timestamp DESC`;
    return rows.map((r: any) => ({
      ...r,
      screenshot_url: r.screenshot_path ? `/screenshots/hits/${r.screenshot_path}` : null,
    }));
  }
  if (!fs.existsSync(WA_HITS_JSON)) return [];
  try { 
    const data = JSON.parse(fs.readFileSync(WA_HITS_JSON, 'utf-8'));
    return data.map((r: any) => ({
      ...r,
      screenshot_url: r.screenshot ? `/screenshots/hits/${r.screenshot}` : null,
    }));
  } catch { return []; }
}

async function getWaCheckoutResults() {
  if (CLOUD_MODE) {
    const { rows } = await sql`SELECT * FROM wa_checkout_results ORDER BY timestamp DESC`;
    return rows;
  }
  if (!fs.existsSync(WA_CHECKOUT_RESULTS_JSON)) return [];
  try { return JSON.parse(fs.readFileSync(WA_CHECKOUT_RESULTS_JSON, 'utf-8')); } catch { return []; }
}

async function getPendingPayment() {
  if (CLOUD_MODE) {
    const { rows } = await sql`SELECT data FROM pending_payment ORDER BY updated_at DESC LIMIT 1`;
    return rows[0]?.data || null;
  }
  if (!fs.existsSync(WA_PENDING_PAYMENT_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(WA_PENDING_PAYMENT_FILE, 'utf-8')); } catch { return null; }
}

async function getSelectedCard() {
  if (CLOUD_MODE) {
    const { rows } = await sql`SELECT data FROM selected_card ORDER BY updated_at DESC LIMIT 1`;
    return rows[0]?.data || null;
  }
  if (!fs.existsSync(WA_SELECTED_CARD_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(WA_SELECTED_CARD_FILE, 'utf-8')); } catch { return null; }
}

async function getCheckoutTerm(): Promise<number> {
  if (CLOUD_MODE) {
    const { rows } = await sql`SELECT term FROM checkout_term ORDER BY updated_at DESC LIMIT 1`;
    return rows[0]?.term || 12;
  }
  if (!fs.existsSync(WA_CHECKOUT_TERM_FILE)) return 12;
  try { return JSON.parse(fs.readFileSync(WA_CHECKOUT_TERM_FILE, 'utf-8')).term; } catch { return 12; }
}

async function logMessage(table: 'logs_wa' | 'logs_wa_checkout' | 'logs_cc' | 'logs_gateway2', message: string) {
  if (CLOUD_MODE) {
    if (table === 'logs_wa') {
      await sql`INSERT INTO logs_wa (message) VALUES (${message})`;
    } else if (table === 'logs_wa_checkout') {
      await sql`INSERT INTO logs_wa_checkout (message) VALUES (${message})`;
    } else if (table === 'logs_cc') {
      await sql`INSERT INTO logs_cc (message) VALUES (${message})`;
    } else if (table === 'logs_gateway2') {
      await sql`INSERT INTO logs_gateway2 (message) VALUES (${message})`;
    }
  } else {
    const logFile = table === 'logs_wa' ? LOG_FILE : (table === 'logs_wa_checkout' ? WA_CHECKOUT_LOG : table === 'logs_gateway2' ? GATEWAY2_LOG_FILE : path.join(DATA_DIR, 'cc_log.txt'));
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
  }
}

async function getLogTailFromDB(table: string, limit = 50): Promise<string[]> {
  if (!sql) return [];
  try {
    const { rows } = await sql.unsafe(`SELECT message FROM ${table} ORDER BY timestamp DESC LIMIT ${limit}`);
    return rows.map((r: any) => r.message).reverse();
  } catch (error) {
    console.error(`Error fetching log tail from ${table}:`, error);
    return [];
  }
}

async function clearTable(table: string) {
  if (sql) await sql.unsafe(`DELETE FROM ${table}`);
}

async function bulkInsertCards(cards: string[]) {
  if (CLOUD_MODE) {
    for (const card of cards) {
      const [card_number, mm, yy, cvv] = card.split('|');
      await sql`INSERT INTO cards (card_number, mm, yy, cvv) VALUES (${card_number}, ${mm}, ${yy}, ${cvv})`;
    }
  } else {
    fs.appendFileSync(CARDS_FILE, cards.join('\n') + '\n');
  }
}

async function bulkInsertPlates(plates: string[]) {
  if (CLOUD_MODE) {
    for (const plate of plates) {
      await sql`INSERT INTO plates (plate) VALUES (${plate})`;
    }
  } else {
    fs.appendFileSync(PLATES_FILE, plates.join('\n') + '\n');
  }
}

async function upsertJson(table: string, data: any) {
  if (CLOUD_MODE) {
    await sql`DELETE FROM ${(sql as any).unsafe(table)}`;
    await sql`INSERT INTO ${(sql as any).unsafe(table)} (data) VALUES (${JSON.stringify(data)})`;
  }
}

/** Cloud-mode guard for automation start/stop */
function cloudModeError(res: Response, action: string) {
  return res.status(503).json({
    success: false,
    message: `${action} is not available in cloud mode. Run automation locally with start.sh`,
    cloud_mode: true,
  });
}

// --- Log Helpers ---
function processLogLineForCloud(rawLine: string) {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;

  const timestampMatch = trimmed.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
  const content = timestampMatch ? trimmed.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '') : trimmed;

  let level: 'info' | 'success' | 'warning' | 'error' | 'progress' = 'info';
  if (content.includes('[red]') || content.includes('ERROR') || content.includes('Failed')) level = 'error';
  else if (content.includes('[green]') || content.includes('SUCCESS')) level = 'success';
  else if (content.includes('[yellow]') || content.includes('warning')) level = 'warning';
  else if (content.includes('Starting') || content.includes('Processing')) level = 'progress';

  const sanitized = content
    .replace(/\b[A-Z0-9]{17}\b/g, 'VIN_MASKED')
    .replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/g, 'EMAIL_MASKED')
    .replace(/Saving screenshot to .*/, 'Screenshot saved');

  return {
    timestamp: timestampMatch ? timestampMatch[1] : new Date().toLocaleTimeString('en-GB', { hour12: false }),
    message: sanitized,
    level,
    raw: trimmed,
  };
}

// --- Helpers ---

function parseGateway2ResultsFile() {
  if (!fs.existsSync(GATEWAY2_RESULTS_FILE)) return [];
  const content = fs.readFileSync(GATEWAY2_RESULTS_FILE, 'utf-8');
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
          screenshot_url: parts[5] ? `/screenshots/gateway2/${parts[5]}` : null,
          timestamp: parts[6] || new Date().toISOString(),
        };
      }
      return null;
    })
    .filter(Boolean);
}

async function getGateway2Results() {
  if (CLOUD_MODE) {
    const { rows } = await sql`SELECT * FROM gateway2_results ORDER BY timestamp DESC`;
    return rows.map((r: any) => ({
      id: r.id,
      card_number: r.card_number,
      mm: r.mm,
      yy: r.yy,
      cvv: r.cvv,
      status: r.status,
      screenshot_path: r.screenshot_path,
      screenshot_url: r.screenshot_path ? `/screenshots/gateway2/${r.screenshot_path}` : null,
      timestamp: r.timestamp,
    }));
  }
  return parseGateway2ResultsFile();
}

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
          screenshot_url: parts[5] ? `/screenshots/${parts[5]}` : null,
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
        screenshot_url: parts[5] ? `/screenshots/${parts[5]}` : null,
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

// --- SSE Live Logs (local file tailing or DB polling) ---
app.get('/api/logs/stream', async (req: Request, res: Response) => {
  const fileParam = req.query.file as string || 'wa';
  const tableMap: Record<string, string> = {
    'wa': 'logs_wa',
    'wa-checkout': 'logs_wa_checkout',
    'cc': 'logs_cc',
    'gateway2': 'logs_gateway2',
    'results': 'logs_results',
  };
const pathMap: Record<string, string> = {
    'wa': LOG_FILE,
    'wa-checkout': WA_CHECKOUT_LOG,
    'cc': path.join(DATA_DIR, 'cc_log.txt'),
    'gateway2': GATEWAY2_LOG_FILE,
    'results': RESULTS_FILE,
  };

  const table = tableMap[fileParam];
  const targetFile = pathMap[fileParam];

  if (CLOUD_MODE && !table) {
    console.log(`SSE ${fileParam} connected - Invalid file for cloud mode`);
    return res.status(400).json({ error: 'Invalid file for cloud mode' });
  }

  if (!CLOUD_MODE && (!targetFile || targetFile === 'undefined')) {
    console.log(`SSE ${fileParam} connected - Invalid log file requested (targetFile is ${targetFile})`);
    return res.status(400).json({ error: 'Invalid log file' });
  }

  if (!CLOUD_MODE && !fs.existsSync(targetFile)) {
    console.log(`SSE ${fileParam} connected - Creating missing log file: ${targetFile}`);
    fs.writeFileSync(targetFile, '');
  }
  console.log(`SSE ${fileParam} connected`);

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  if (CLOUD_MODE) {
    const initialLines = await getLogTailFromDB(table!, 50);
    initialLines.forEach(line => {
      const processed = processLogLineForCloud(line);
      if (processed) res.write(`data: ${JSON.stringify(processed)}\n\n`);
    });
    res.write(': Initial tail sent\n\n');

    const interval = setInterval(async () => {
      if (res.writableEnded) return clearInterval(interval);
      try {
        const lines = await getLogTailFromDB(table!, 3);
        const latest = lines[lines.length - 1];
        if (latest) {
          const processed = processLogLineForCloud(latest);
          if (processed) res.write(`data: ${JSON.stringify(processed)}\n\n`);
        }
      } catch {}
    }, 3000);

    req.on('close', () => clearInterval(interval));
  } else {
    const processLogLine = (rawLine: string) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return null;

      const timestampMatch = trimmed.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
      const content = timestampMatch ? trimmed.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '') : trimmed;

      let level: 'info' | 'success' | 'warning' | 'error' | 'progress' = 'info';
      if (content.includes('[red]') || content.includes('ERROR') || content.includes('Failed')) level = 'error';
      else if (content.includes('[green]') || content.includes('SUCCESS')) level = 'success';
      else if (content.includes('[yellow]') || content.includes('warning')) level = 'warning';
      else if (content.includes('Starting') || content.includes('Processing')) level = 'progress';

      const sanitized = content
        .replace(/\b[A-Z0-9]{17}\b/g, 'VIN_MASKED')
        .replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/g, 'EMAIL_MASKED')
        .replace(/Saving screenshot to .*/, 'Screenshot saved');

      return {
        timestamp: timestampMatch?.[1] || '',
        level,
        content: sanitized,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2)
      };
    };

    try {
      const content = fs.readFileSync(targetFile, 'utf-8');
      const rawLines = content.split('\n').slice(-50).filter(Boolean);
      rawLines.slice(0, 30).forEach(line => {
        const processed = processLogLine(line);
        if (processed) res.write(`data: ${JSON.stringify(processed)}\n\n`);
      });
    } catch {}

    let lastSize = 0;
    const onLogChange = () => {
      try {
        const stats = fs.statSync(targetFile);
        if (stats.size > lastSize) {
          const stream = fs.createReadStream(targetFile, { start: lastSize });
          let buffer = '';
          stream.on('data', (chunk) => { buffer += chunk; });
          stream.on('end', () => {
            buffer.split('\n').filter(Boolean).forEach(line => {
              const processed = processLogLine(line);
              if (processed) res.write(`data: ${JSON.stringify(processed)}\n\n`);
            });
          });
          lastSize = stats.size;
        }
      } catch {}
    };

    const watcher = fs.watchFile(targetFile, { interval: 1000 }, onLogChange) as any;
    if (watcher && typeof watcher.setMaxListeners === 'function') {
      watcher.setMaxListeners(100);
    }

    req.on('close', () => {
      fs.unwatchFile(targetFile, onLogChange);
    });
  }

  req.on('close', () => {
    if (!res.writableEnded) res.end();
  });
});

// --- Endpoints ---

app.get('/api/status', async (req: Request, res: Response) => {
  const isRunning = isProcessAlive(ccCheckProcess);
  const results = await getResults();
  const remaining = await countCards();

  res.json({
    is_running: isRunning,
    remaining_cards: remaining,
    total_processed: results.length,
  });
});

app.get('/api/results', async (req: Request, res: Response) => {
  const runs = await getResultsGrouped();
  runs.reverse();
  const allResults = await getResults();
  res.json({
    runs,
    total: allResults.length,
  });
});

app.get('/api/results/cc', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const allResults = await getResults();
  const start = (page - 1) * limit;
  const results = allResults.slice(start, start + limit);
  res.json({
    results,
    total: allResults.length,
    hasMore: start + limit < allResults.length
  });
});

app.get('/api/results/wa', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  const waResults = await getWaCheckoutResults();
  
  const start = (page - 1) * limit;
  const results = waResults.slice(start, start + limit);
  res.json({
    results,
    total: waResults.length,
    hasMore: start + limit < waResults.length
  });
});

app.get('/api/analytics', async (req: Request, res: Response) => {
  const results = await getResults();
  const successCount = results.filter((r: any) => r && r.status === 'SUCCESS').length;
  const failCount = results.filter((r: any) => r && ['FAIL', 'ERROR_PREPAYMENT'].includes(r.status)).length;
  const totalCount = results.length;
  const successRate = totalCount > 0 ? (successCount / totalCount * 100) : 0;

  const timeSeries = results.slice(-60).map((r: any) => ({
    timestamp: r.timestamp,
    value: r.status === 'SUCCESS' ? 1 : 0,
  }));

  const timeBuckets = (() => {
    const now = Date.now();
    const buckets: { timestamp: number; success: number; fail: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const windowStart = now - (9 - i) * 300000;
      const windowEnd = now - (9 - i - 1) * 300000;
      const successes = results.filter((r: any) => 
        r.timestamp >= windowStart && r.timestamp < windowEnd && r.status === 'SUCCESS'
      ).length;
      const failures = results.filter((r: any) => 
        r.timestamp >= windowStart && r.timestamp < windowEnd && ['FAIL', 'ERROR_PREPAYMENT'].includes(r.status)
      ).length;
      buckets.push({ timestamp: windowStart, success: successes, fail: failures });
    }
    return buckets;
  })();

  res.json({
    success_count: successCount,
    fail_count: failCount,
    total_count: totalCount,
    success_rate: Math.round(successRate * 10) / 10,
    time_series: timeSeries,
    time_buckets: timeBuckets,
  });
});

app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
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

    await bulkInsertCards(validLines);
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

    await bulkInsertPlates(validLines);
    res.json({ success: true, message: `Uploaded ${validLines.length} plates`, count: validLines.length });
  } else {
    res.status(400).json({ success: false, message: `Invalid target: ${target}` });
  }
});

app.post('/api/processing/start', (req: Request, res: Response) => {
  if (DISABLE_AUTOMATION) return cloudModeError(res, 'CC Checker');
  if (isProcessAlive(ccCheckProcess)) {
    return res.json({ success: false, message: 'CC Check is already running' });
  }

  const scriptPath = path.join(BASE_DIR, 'src', 'automation', 'cc_checker', 'check.ts');
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
  if (DISABLE_AUTOMATION) return cloudModeError(res, 'CC Checker');
  if (isProcessAlive(ccCheckProcess)) {
    killProcessGroup(ccCheckProcess);
    ccCheckProcess = null;
    return res.json({ success: true, message: 'Processing stopped' });
  }
  ccCheckProcess = null;
  res.json({ success: false, message: 'Processing is not running' });
});

app.get('/api/gateway2/status', async (req: Request, res: Response) => {
  const isRunning = isProcessAlive(gateway2Process);
  const results = await getGateway2Results();
  const remaining = await countCards();
  res.json({
    is_running: isRunning,
    remaining_cards: remaining,
    total_processed: results.length,
  });
});

app.post('/api/gateway2/start', (req: Request, res: Response) => {
  if (DISABLE_AUTOMATION) return cloudModeError(res, 'Gateway2');
  if (isProcessAlive(gateway2Process)) {
    return res.json({ success: false, message: 'Gateway2 is already running' });
  }
  const scriptPath = path.join(BASE_DIR, 'src', 'automation', 'gateway2', 'check.ts');
  try {
    gateway2Process = spawn('npx', ['tsx', scriptPath], {
      cwd: BASE_DIR,
      detached: true,
      stdio: 'ignore'
    });
    gateway2Process.unref();
    res.json({ success: true, message: 'Gateway2 started', pid: gateway2Process.pid });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/gateway2/stop', (req: Request, res: Response) => {
  if (isProcessAlive(gateway2Process)) {
    killProcessGroup(gateway2Process);
    gateway2Process = null;
    return res.json({ success: true, message: 'Gateway2 stopped' });
  }
  gateway2Process = null;
  res.json({ success: false, message: 'Gateway2 is not running' });
});

app.get('/api/gateway2/results', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const allResults = await getGateway2Results();
  const start = (page - 1) * limit;
  const results = allResults.slice(start, start + limit);
  res.json({
    results,
    total: allResults.length,
    hasMore: start + limit < allResults.length
  });
});

app.post('/api/gateway2/clear', async (req: Request, res: Response) => {
  if (CLOUD_MODE) {
    await clearTable('gateway2_results');
    await clearTable('logs_gateway2');
  } else {
    if (fs.existsSync(GATEWAY2_RESULTS_FILE)) fs.writeFileSync(GATEWAY2_RESULTS_FILE, '');
    if (fs.existsSync(GATEWAY2_LOG_FILE)) fs.writeFileSync(GATEWAY2_LOG_FILE, '');
  }
  res.json({ success: true, message: 'Gateway2 cleared' });
});

app.post('/api/results/clear', async (req: Request, res: Response) => {
  await clearTable('results');
  if (!CLOUD_MODE) fs.writeFileSync(RESULTS_FILE, '');
  res.json({ success: true, message: 'Results cleared' });
});

app.post('/api/rerun', async (req: Request, res: Response) => {
  const { cards } = req.body;
  if (!cards || !Array.isArray(cards)) return res.status(400).json({ success: false, message: 'No cards provided' });

  const newLines = cards.map((c: any) => `${c.card_number}|${c.mm}|${c.yy}|${c.cvv}`);
  await bulkInsertCards(newLines);
  res.json({ success: true, message: `Re-queued ${newLines.length} cards`, count: newLines.length });
});

app.get('/api/logs/tail', async (req: Request, res: Response) => {
  const file = req.query.file as string || 'wa';
  const linesCount = parseInt(req.query.lines as string) || 50;

  if (CLOUD_MODE) {
    const tableMap: Record<string, string> = {
      'wa': 'logs_wa',
      'wa-checkout': 'logs_wa_checkout',
      'cc': 'logs_cc',
    };
    const table = tableMap[file];
    if (!table) return res.json({ lines: [] });
    const lines = await getLogTailFromDB(table, linesCount);
    return res.json({ lines });
  }

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

app.get('/api/health', async (req: Request, res: Response) => {
  if (CLOUD_MODE) {
    try {
      await sql`SELECT 1`;
      return res.json({ status: 'ok', db: 'connected', cloud_mode: true });
    } catch {
      return res.status(500).json({ status: 'error', db: 'disconnected' });
    }
  }
  res.json({ status: 'ok', cloud_mode: false });
});

// --- Plate Check Endpoints ---

app.post('/api/plate-check/start', (req: Request, res: Response) => {
  if (DISABLE_AUTOMATION) return cloudModeError(res, 'Plate Check');
  if (isProcessAlive(plateCheckProcess)) {
    return res.json({ success: false, message: 'Plate check is already running' });
  }

  const scriptPath = path.join(BASE_DIR, 'src', 'automation', 'wa_rego', 'check.ts');
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
  if (DISABLE_AUTOMATION) return cloudModeError(res, 'Plate Check');
  if (isProcessAlive(plateCheckProcess)) {
    killProcessGroup(plateCheckProcess);
    plateCheckProcess = null;
    return res.json({ success: true, message: 'Plate check stopped' });
  }
  plateCheckProcess = null;
  res.json({ success: false, message: 'Plate check is not running' });
});

app.post('/api/plate-check/clear', async (req: Request, res: Response) => {
  if (CLOUD_MODE) {
    await clearTable('wa_hits');
    await clearTable('logs_wa');
  } else {
    fs.writeFileSync(LOG_FILE, '');
    if (fs.existsSync(WA_HITS_JSON)) fs.writeFileSync(WA_HITS_JSON, '[]');
    if (fs.existsSync(WA_HITS_FILE)) fs.writeFileSync(WA_HITS_FILE, '');
  }
  res.json({ success: true, message: 'Plate logs and hits cleared' });
});

app.post('/api/plate-check/generate', async (req: Request, res: Response) => {
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

  await bulkInsertPlates(generated);
  res.json({ success: true, message: `Generated ${count} plates`, count });
});

app.get('/api/plate-check/status', async (req: Request, res: Response) => {
  const isRunning = isProcessAlive(plateCheckProcess);
  if (!isRunning && plateCheckProcess) plateCheckProcess = null;

  const hits = await getWaHits();
  const hitsCount = hits.length;
  const pendingCount = await countPlates();

  res.json({
    is_running: isRunning,
    hits_count: hitsCount,
    total_lines: hitsCount + pendingCount,
    pending_count: pendingCount,
  });
});

app.get('/api/plate-check/results', async (req: Request, res: Response) => {
  if (CLOUD_MODE) {
    const lines = await getLogTailFromDB('logs_wa', 100);
    return res.json({ results: lines });
  }

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
  if (DISABLE_AUTOMATION) return cloudModeError(res, 'WA Checkout');
  if (isProcessAlive(plateCheckoutProcess)) {
    return res.json({ success: false, message: 'WA Checkout is already running' });
  }

  const scriptPath = path.join(BASE_DIR, 'src', 'automation', 'wa_rego', 'checkout.ts');
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
  if (DISABLE_AUTOMATION) return cloudModeError(res, 'WA Checkout');
  if (isProcessAlive(plateCheckoutProcess)) {
    killProcessGroup(plateCheckoutProcess);
    plateCheckoutProcess = null;
    return res.json({ success: true, message: 'WA Checkout stopped' });
  }
  plateCheckoutProcess = null;
  res.json({ success: false, message: 'WA Checkout is not running' });
});

app.post('/api/wa-checkout/clear', async (req: Request, res: Response) => {
  if (CLOUD_MODE) {
    await clearTable('wa_checkout_results');
    await clearTable('logs_wa_checkout');
  } else {
    fs.writeFileSync(WA_CHECKOUT_LOG, '');
    if (fs.existsSync(WA_CHECKOUT_RESULTS_JSON)) fs.writeFileSync(WA_CHECKOUT_RESULTS_JSON, '[]');
  }
  res.json({ success: true, message: 'WA Checkout logs and results cleared' });
});

app.get('/api/wa-rego/hits', async (req: Request, res: Response) => {
  const hits = await getWaHits();
  res.json(hits);
});

app.get('/api/wa-rego/checkout-results', async (req: Request, res: Response) => {
  const results = await getWaCheckoutResults();
  res.json(results);
});

app.post('/api/wa-checkout/set-term', async (req: Request, res: Response) => {
  const { term } = req.body;
  if (![3, 6, 12].includes(term)) {
    return res.status(400).json({ success: false, message: 'Term must be 3, 6, or 12' });
  }
  if (CLOUD_MODE) {
    await upsertJson('checkout_term', { term });
  } else {
    fs.writeFileSync(WA_CHECKOUT_TERM_FILE, JSON.stringify({ term }));
  }
  res.json({ success: true, message: `Term set to ${term} months` });
});

app.get('/api/wa-checkout/term', async (req: Request, res: Response) => {
  const term = await getCheckoutTerm();
  res.json({ term });
});

app.get('/api/wa-checkout/status', async (req: Request, res: Response) => {
  const isRunning = isProcessAlive(plateCheckoutProcess);
  if (!isRunning && plateCheckoutProcess) plateCheckoutProcess = null;
  
  const hits = await getWaHits();
  const hitsCount = hits.length;
  
  const pending_payment = await getPendingPayment();

  res.json({ 
    is_running: isRunning, 
    hits_to_process: hitsCount,
    pending_payment: pending_payment
  });
});

app.post('/api/wa-checkout/select-card', async (req: Request, res: Response) => {
  const cardData = req.body;
  if (!cardData || !cardData.card_number) {
    return res.status(400).json({ success: false, message: 'Invalid card data' });
  }

  if (CLOUD_MODE) {
    await upsertJson('selected_card', cardData);
  } else {
    fs.writeFileSync(WA_SELECTED_CARD_FILE, JSON.stringify(cardData));
  }
  res.json({ success: true, message: 'Card selected for automation' });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} (all interfaces)`);
  });
}

// Fallback for SPA routing (DISABLED - path-to-regexp v8 doesn't support * wildcard)
if (false) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/screenshots')) {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

export default app;
