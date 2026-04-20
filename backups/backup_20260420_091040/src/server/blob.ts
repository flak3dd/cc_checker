import { put, list } from '@vercel/blob';
import { Readable } from 'stream';

export interface DbRecord {
  id: string;
  timestamp: string;
  [key: string]: any;
}

export async function putJson(key: string, data: any): Promise<void> {
  await put(key, JSON.stringify(data), { access: 'public', addRandomSuffix: false });
}

export async function getBlobText(key: string): Promise<string | null> {
  try {
    const b = await list({ prefix: key, limit: 1 });
    const blob = b.blobs[0];
    if (!blob) return null;
    const response = await fetch(blob.url);
    const text = await response.text();
    return text;
  } catch {
    return null;
  }
}

export async function listBlobKeys(prefix: string): Promise<string[]> {
  const blobs = await list({ prefix });
  return blobs.blobs.map(b => b.pathname);
}

export async function appendToArray(key: string, item: any): Promise<void> {
  const arrStr = await getBlobText(key) || '[]';
  const arr = JSON.parse(arrStr);
  arr.push(item);
  await putJson(key, arr);
}

export async function upsertJson(key: string, data: any): Promise<void> {
  await putJson(key, data);
}

export async function clearBlob(key: string): Promise<void> {
  // Vercel Blob no delete; overwrite empty
  await putJson(key, []);
}

