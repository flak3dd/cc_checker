import { test, expect } from '@playwright/test';

test.describe('Dashboard Modernization E2E', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

  test.beforeEach(async ({ page }) => {
    // Wait for the app to be available (port 8000 as per investigation)
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    // Reduced splash animation to 2.5s + asset loading. 5s is safe.
    await page.waitForTimeout(5000);
  });

  test('Dashboard should display Monitor sub-tab with blocks by default', async ({ page }) => {
    // Check for the new sub-tab switchers
    await expect(page.getByRole('button', { name: 'MONITOR' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'RESULTS' })).toBeVisible();

    // Verify main components are present in Monitor view
    await expect(page.getByText('UPLOAD DATA')).toBeVisible();
    await expect(page.getByText('CONTROLS')).toBeVisible();
    await expect(page.getByText('LIVE ACTIVITY')).toBeVisible();

    // Verify two-column layout roughly by checking existence of both columns
    // The columns are wrapped in a div with flex-wrap: wrap
    await expect(page.getByText('CC / PPSR Checker').first()).toBeVisible();
    await expect(page.getByText('WA Checkout').first()).toBeVisible();
  });

  test('Should switch to Results sub-tab and display filters and stats', async ({ page }) => {
    const resultsBtn = page.getByRole('button', { name: 'RESULTS' });
    await resultsBtn.click();

    // Check for Results-specific components
    await expect(page.getByPlaceholder('Search...')).toBeVisible();
    await expect(page.getByText('SEARCH & FILTER')).toBeVisible();
    await expect(page.getByText('SUMMARY')).toBeVisible();
    
    // Check for stats boxes
    await expect(page.getByText('TOTAL')).toBeVisible();
    await expect(page.getByText('SUCCESS')).toBeVisible();
    await expect(page.getByText('FAILED')).toBeVisible();

    // Check for the table header (title in results.tsx)
    await expect(page.getByText('CC DATA STREAM')).toBeVisible();
  });

  test('Logs page should reflect the new two-column redesign', async ({ page }) => {
    // Navigate to Logs tab in bottom nav
    const logsTab = page.getByRole('tab', { name: /Logs/ });
    await logsTab.click();

    // Wait for navigation
    await page.waitForTimeout(500);

    // Verify the new layout blocks
    await expect(page.getByText('SYSTEM CONTROL')).toBeVisible();
    await expect(page.getByText('ROTATION STATS')).toBeVisible();
    await expect(page.getByText('WA REGISTRATION HITS')).toBeVisible();
    await expect(page.getByText('LIVE ROTATION STREAM')).toBeVisible();
    await expect(page.getByText('RAW ACTIVITY LOG')).toBeVisible();

    // Verify action buttons
    await expect(page.getByText('GENERATE 100')).toBeVisible();
    await expect(page.getByText('CLEAR', { exact: true })).toBeVisible();
  });

  test('Unified Clear All Data button should be present on Dashboard', async ({ page }) => {
    // Navigate back to Dashboard if needed
    await page.getByRole('tab', { name: /Dashboard/ }).click();
    
    const clearBtn = page.getByText('CLEAR ALL DATA');
    await expect(clearBtn).toBeVisible();
    
    // Check color (should be danger colors.danger: #EF4444)
    const color = await clearBtn.evaluate((el) => window.getComputedStyle(el).color);
    expect(color).toBe('rgb(239, 68, 68)');
  });
});
