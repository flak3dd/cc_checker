/**
 * Vercel Serverless API with Postgres — Express app for @vercel/node runtime.
 * 
 * Replaces /tmp file storage with Postgres for durable persistence.
 * Automation still cloud-disabled; use local start.sh for Playwright.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
const CLOUD_MODE = true;

// --- Paths (screenshots only now) ---
const SCREENSHOTS_DIR = '/tmp/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(path.join(SCREENSHOTS_DIR, 'hits'))) fs.mkdirSync(path.join(SCREENSHOTS_DIR, 'hits'), { recursive: true });

// --- Middleware ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use('/screenshots', express.static(SCREENSHOTS_DIR));

const upload = multer({ storage: multer.memoryStorage() });

// --- DB Schema Init (runs on cold start) ---
async function initSchema() {
  try {
    // Results table
    await sql`
      CREATE TABLE IF NOT EXISTS results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        card_number TEXT NOT NULL,
        mm TEXT NOT NULL,
        yy TEXT NOT NULL,
        cvv TEXT NOT NULL,
        status TEXT NOT NULL,
        screenshot_path TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        INDEX idx_status (status),
        INDEX idx_timestamp (timestamp)
      );
    `;

    // Cards queue
    await sql`
      CREATE TABLE IF NOT EXISTS cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        card_number TEXT NOT NULL,
        mm TEXT NOT NULL,
        yy TEXT NOT NULL,
        cvv TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        INDEX idx_card (card_number, mm, yy, cvv)
      );
    `;

    // Plates queue
    await sql`
      CREATE TABLE IF NOT EXISTS plates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plate TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        INDEX idx_plate (plate)
      );
    `;

    // WA Hits
    await sql`
      CREATE TABLE IF NOT EXISTS wa_hits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plate TEXT NOT NULL,
        data JSONB,
        screenshot_path TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // WA Checkout Results
    await sql`
      CREATE TABLE IF NOT EXISTS wa_checkout_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        data JSONB NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Logs tables
    await sql`
      CREATE TABLE IF NOT EXISTS logs_wa (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), message TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS logs_wa_checkout (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), message TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS logs_cc (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), message TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW());
    `;

    // State tables (singleton-like)
    await sql`
      CREATE TABLE IF NOT EXISTS pending_payment (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), data JSONB, updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS selected_card (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), data JSONB, updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS checkout_term (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), term INTEGER DEFAULT 12, updated_at TIMESTAMPTZ DEFAULT NOW());
    `;

    console.log('Postgres schema initialized');
  } catch (error) {
    console.error('Schema init failed:', error);
  }
}

// Init on first request
let schemaInited = false;
app.use(async (_req: Request, res: Response, next) => {
  if (!schemaInited) {
    await initSchema();
    schemaInited = true;
  }
  next();
});

// --- DB Helpers ---
async function getResults(): Promise<any[]> {
  const { rows } = await sql`SELECT * FROM results ORDER BY timestamp DESC`;
  return rows.map(r => ({
    card_number: r.card_number,
    mm: r.mm,
    yy: r.yy,
    cvv: r.cvv,
    status: r.status,
    screenshot_path: r.screenshot_path,
    timestamp: r.timestamp,
  }));
}

async function getResultsGrouped(): Promise<any[][]> {
  // Simple grouping by approximate run (last 50 results split into chunks)
  const results = await getResults();
  const chunkSize = 20;
  const runs: any[][] = [];
  for (let i = 0; i < results.length; i += chunkSize) {
    runs.push(results.slice(i, i + chunkSize));
  }
  return runs.reverse();
}

async function countCards(): Promise<number> {
  const { rows } = await sql`SELECT COUNT(*)::integer FROM cards`;
  return rows[0].count;
}

async function countPlates(): Promise<number> {
  const { rows } = await sql`SELECT COUNT(*)::integer FROM plates`;
  return rows[0].count;
}

async function countWaHits(): Promise<number> {
  const { rows } = await sql`SELECT COUNT(*)::integer FROM wa_hits`;
  return rows[0].count;
}

async function getWaHits() {
  const { rows } = await sql`SELECT * FROM wa_hits ORDER BY timestamp DESC`;
  return rows;
}

async function getWaCheckoutResults() {
  const { rows } = await sql`SELECT * FROM wa_checkout_results ORDER BY timestamp DESC`;
  return rows;
}

async function getPendingPayment() {
  const { rows } = await sql`SELECT data FROM pending_payment ORDER BY updated_at DESC LIMIT 1`;
  return rows[0]?.data || null;
}

async function getSelectedCard() {
  const { rows } = await sql`SELECT data FROM selected_card ORDER BY updated_at DESC LIMIT 1`;
  return rows[0]?.data || null;
}

async function getCheckoutTerm(): Promise<number> {
  const { rows } = await sql`SELECT term FROM checkout_term ORDER BY updated_at DESC LIMIT 1`;
  return rows[0]?.term || 12;
}

async function logMessage(table: 'logs_wa' | 'logs_wa_checkout' | 'logs_cc', message: string) {
  await sql`INSERT INTO ${sql.unsafe(table)} (message) VALUES (${message})`;
}

async function getLogTail(table: string, limit = 50): Promise<string[]> {
  const { rows } = await sql.unsafe(`SELECT message FROM ${table} ORDER BY timestamp DESC LIMIT ${limit}`);
  return rows.map(r => r.message).reverse();
}

async function clearTable(table: string) {
  await sql.unsafe(`DELETE FROM ${table}`);
}

async function bulkInsertCards(cards: string[]) {
  for (const card of cards) {
    const [card_number, mm, yy, cvv] = card.split('|');
    await sql`INSERT INTO cards (card_number, mm, yy, cvv) VALUES (${card_number}, ${mm}, ${yy}, ${cvv})`;
  }
}

async function bulkInsertPlates(plates: string[]) {
  for (const plate of plates) {
    await sql`INSERT INTO plates (plate) VALUES (${plate})`;
  }
}

async function upsertJson(table: string, data: any) {
  await sql`DELETE FROM ${sql.unsafe(table)}`;
  await sql`INSERT INTO ${sql.unsafe(table)} (data) VALUES (${JSON.stringify(data)})`;
}

/** Cloud-mode guard */
function cloudModeError(res: Response, action: string) {
  return res.status(503).json({
    success: false,
    message: `${action} is not available in cloud mode. Run automation locally with start.sh`,
    cloud_mode: true,
  });
}

// ─── Health ─────────────────────────────────────────────────────
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await sql`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', cloud_mode: CLOUD_MODE, runtime: 'vercel' });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── Status & Analytics ─────────────────────────────────────────
app.get('/api/status', async (_req: Request, res: Response) => {
  const [resultsLen, remaining] = await Promise.all([getResults().then(r => r.length), countCards()]);
  res.json({
    is_running: false,
    remaining_cards: remaining,
    total_processed: resultsLen,
  });
});

app.get('/api/results', async (_req: Request, res: Response) => {
  const [runs, total] = await Promise.all([getResultsGrouped(), getResults().then(r => r.length)]);
  res.json({ runs, total });
});

app.get('/api/analytics', async (_req: Request, res: Response) => {
  const { rows } = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
      COUNT(*) FILTER (WHERE status IN ('FAIL', 'ERROR_PREPAYMENT')) as fail_count,
      COUNT(*) as total_count
    FROM results
  `;
  const { success_count, fail_count, total_count } = rows[0];
  const success_rate = total_count > 0 ? (success_count / total_count * 100) : 0;
  res.json({
    success_count,
    fail_count,
    total_count,
    success_rate: Math.round(success_rate * 10) / 10,
  });
});

// ─── Upload ─────────────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  const target = req.query.target as string || 'cc';
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const content = req.file.buffer.toString('utf-8');
  const lines = content.trim().split(/\r?\n/);

  try {
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
      res.json({ success: true, message: `Uploaded ${validLines.length} cards to DB`, count: validLines.length });
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
      await bulkInsertPlates(validLines);
      res.json({ success: true, message: `Uploaded ${validLines.length} plates to DB`, count: validLines.length });
    } else {
      res.status(400).json({ success: false, message: `Invalid target: ${target}` });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'DB insert failed' });
  }
});

// ─── Process Management (cloud-disabled) ────────────────────────
app.post('/api/processing/start', (_req: Request, res: Response) => cloudModeError(res, 'CC Checker'));
app.post('/api/processing/stop', (_req: Request, res: Response) => cloudModeError(res, 'CC Checker'));
app.post('/api/plate-check/start', (_req: Request, res: Response) => cloudModeError(res, 'Plate Check'));
app.post('/api/plate-check/stop', (_req: Request, res: Response) => cloudModeError(res, 'Plate Check'));
app.post('/api/wa-checkout/start', (_req: Request, res: Response) => cloudModeError(res, 'WA Checkout'));
app.post('/api/wa-checkout/stop', (_req: Request, res: Response) => cloudModeError(res, 'WA Checkout'));

// ─── Data Management ────────────────────────────────────────────
app.post('/api/results/clear', async (_req: Request, res: Response) => {
  await clearTable('results');
  res.json({ success: true, message: 'Results cleared from DB' });
});

app.post('/api/rerun', async (req: Request, res: Response) => {
  const { cards } = req.body;
  if (!cards || !Array.isArray(cards)) return res.status(400).json({ success: false, message: 'No cards provided' });

  const newLines = cards.map((c: any) => `${c.card_number}|${c.mm}|${c.yy}|${c.cvv}`);
  await bulkInsertCards(newLines);
  res.json({ success: true, message: `Re-queued ${newLines.length} cards to DB`, count: newLines.length });
});

// ─── Logs ───────────────────────────────────────────────────────
app.get('/api/logs/tail', async (req: Request, res: Response) => {
  const file = req.query.file as string || 'wa';
  const linesCount = parseInt(req.query.lines as string) || 50;

  const tableMap: Record<string, string> = {
    'wa': 'logs_wa',
    'wa-checkout': 'logs_wa_checkout',
    'results': 'results', // reuse for now
    'cc': 'logs_cc',
  };

  const table = tableMap[file];
  if (!table) return res.json({ lines: [] });

  const lines = await getLogTail(table!, linesCount);
  res.json({ lines });
});

// ─── Plate Check ────────────────────────────────────────────────
app.post('/api/plate-check/clear', async (_req: Request, res: Response) => {
  await Promise.all([clearTable('logs_wa'), clearTable('wa_hits')]);
  res.json({ success: true, message: 'Plate logs and hits cleared from DB' });
});

app.post('/api/plate-check/generate', async (req: Request, res: Response) => {
  const count = parseInt(req.query.count as string) || 100;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const generated: string[] = [];

  for (let i = 0; i < count; i++) {
    let l = '';
    for (let j = 0; j < 3; j++) l += chars.charAt(Math.floor(Math.random() * chars.length));
    let d = '';
    for (let j = 0; j < 3; j++) d += digits.charAt(Math.floor(Math.random() * digits.length));
    generated.push(`1${l}${d}`);
  }

  await bulkInsertPlates(generated);
  res.json({ success: true, message: `Generated ${count} plates to DB`, count });
});

app.get('/api/plate-check/status', async (_req: Request, res: Response) => {
  const [hitsCount, pendingCount] = await Promise.all([countWaHits(), countPlates()]);
  res.json({
    is_running: false,
    hits_count: hitsCount,
    total_lines: hitsCount + pendingCount,
    pending_count: pendingCount,
  });
});

app.get('/api/plate-check/results', async (_req: Request, res: Response) => {
  const logs = await getLogTail('logs_wa', 100);
  res.json({ results: logs });
});

// ─── WA Rego / Checkout ─────────────────────────────────────────
app.get('/api/wa-rego/hits', getWaHits);

app.get('/api/wa-rego/checkout-results', getWaCheckoutResults);

app.post('/api/wa-checkout/clear', async (_req: Request, res: Response) => {
  await clearTable('wa_checkout_results');
  await clearTable('logs_wa_checkout');
  res.json({ success: true, message: 'WA Checkout data cleared from DB' });
});

app.post('/api/wa-checkout/set-term', async (req: Request, res: Response) => {
  const { term } = req.body;
  if (![3, 6, 12].includes(term)) {
    return res.status(400).json({ success: false, message: 'Term must be 3, 6, or 12' });
  }
  await sql`DELETE FROM checkout_term`;
  await sql`INSERT INTO checkout_term (term) VALUES (${term})`;
  res.json({ success: true, message: `Term set to ${term} months` });
});

app.get('/api/wa-checkout/term', async (_req: Request, res: Response) => {
  const term = await getCheckoutTerm();
  res.json({ term });
});

app.get('/api/wa-checkout/status', async (_req: Request, res: Response) => {
  const [hitsCount, pendingPayment] = await Promise.all([
    countWaHits(),
    getPendingPayment()
  ]);
  res.json({
    is_running: false,
    hits_to_process: hitsCount,
    pending_payment: pendingPayment,
  });
});

app.post('/api/wa-checkout/select-card', async (req: Request, res: Response) => {
  const cardData = req.body;
  if (!cardData || !cardData.card_number) {
    return res.status(400).json({ success: false, message: 'Invalid card data' });
  }
  await upsertJson('selected_card', cardData);
  res.json({ success: true, message: 'Card selected (stored in DB)' });
});

// ─── Sync (local → cloud push/pull) ─────────────────────────────
app.post('/api/sync/push', async (req: Request, res: Response) => {
  const { table, data, append = false } = req.body;
  if (!table || data === undefined) {
    return res.status(400).json({ success: false, message: 'table and data required' });
  }

  const allowedTables = ['results', 'wa_hits', 'wa_checkout_results', 'logs_wa', 'logs_wa_checkout', 'logs_cc', 'pending_payment', 'selected_card'];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ success: false, message: `Table not allowed: ${table}` });
  }

  try {
    if (append) {
      // Append mode for logs/results (INSERT)
      if (Array.isArray(data)) {
        for (const item of data) {
          if (table === 'results') {
            const { card_number, mm, yy, cvv, status, screenshot_path, timestamp } = item;
            await sql`
              INSERT INTO results (card_number, mm, yy, cvv, status, screenshot_path, timestamp)
              VALUES (${card_number}, ${mm}, ${yy}, ${cvv}, ${status}, ${screenshot_path}, ${timestamp || new Date().toISOString()})
            `;
          } else if (table === 'wa_hits') {
            await sql`INSERT INTO wa_hits (plate, data, screenshot_path) VALUES (${item.plate}, ${JSON.stringify(item.data)}, ${item.screenshot_path})`;
          }
          // Add more append cases as needed
        }
      }
    } else {
      // Replace (upsert)
      await upsertJson(table, data);
    }
    res.json({ success: true, message: `Synced to ${table}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sync failed' });
  }
});

app.get('/api/sync/pull', async (req: Request, res: Response) => {
  const table = req.query.table as string;
  if (!table) return res.status(400).json({ success: false, message: 'table param required' });

  const allowedTables = ['cards', 'plates', 'selected_card', 'checkout_term'];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ success: false, message: `Table not allowed: ${table}` });
  }

  let content: any;
  switch (table) {
    case 'cards':
      content = await sql`SELECT card_number || '|' || mm || '|' || yy || '|' || cvv AS line FROM cards`;
      break;
    case 'plates':
      content = await sql`SELECT plate AS line FROM plates`;
      break;
    case 'selected_card':
    case 'checkout_term':
      if (table === 'selected_card') content = await getSelectedCard();
      else content = { term: await getCheckoutTerm() };
      break;
  }
  res.json({ success: true, content });
});

// ─── Export for Vercel ──────────────────────────────────────────
export default app;

