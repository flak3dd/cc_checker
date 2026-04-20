import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Server API Tests', () => {
  const BASE_URL = 'http://localhost:8000';

  test('GET /api/status should return system status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/status`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('is_running');
    expect(data).toHaveProperty('remaining_cards');
    expect(data).toHaveProperty('total_processed');
  });

  test('GET /api/results should return processed results', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/results`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('runs');
    expect(data).toHaveProperty('total');
  });

  test('GET /api/analytics should return analytics data', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/analytics`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('success_count');
    expect(data).toHaveProperty('fail_count');
    expect(data).toHaveProperty('success_rate');
  });

  test('GET /api/wa-rego/hits should return registration hits', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/wa-rego/hits`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /api/wa-checkout/status should return checkout status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/wa-checkout/status`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('is_running');
    expect(data).toHaveProperty('hits_to_process');
    expect(data).toHaveProperty('pending_payment');
  });


  test('POST /api/upload should validate target', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/upload?target=invalid`);
    expect(response.status()).toBe(400);
  });
});
