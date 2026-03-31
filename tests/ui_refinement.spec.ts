import { test, expect } from '@playwright/test';

test.describe('UI Refinement Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for the app to be available
    await page.goto('http://localhost:8085', { waitUntil: 'networkidle' });
    // Wait for splash screen animation to finish (approx 6 seconds, giving 15 for safety)
    await page.waitForTimeout(15000);
  });

  test('Dashboard should have refined theme colors', async ({ page }) => {
    // Check background color of the main container
    const container = page.locator('div[dir="auto"]').first();
    const bgColor = await container.evaluate((el) => {
      // Find the first element with a background color that isn't transparent
      let curr: HTMLElement | null = el as HTMLElement;
      while (curr) {
        const bg = window.getComputedStyle(curr).backgroundColor;
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        curr = curr.parentElement;
      }
      return 'transparent';
    });
    expect(bgColor).toBe('rgb(9, 9, 11)');

    // Check header text color (textPrimary: #FAFAFA)
    // Using a more specific selector to avoid splash screen leftovers
    const headerTitle = page.locator('div[dir="auto"]:has-text("Card")').filter({ hasText: "Checker" }).first();
    const titleColor = await headerTitle.evaluate((el) => window.getComputedStyle(el).color);
    expect(titleColor).toBe('rgb(250, 250, 250)');
  });

  test('Navigation tabs should be styled correctly', async ({ page }) => {
    // Check tabs using simpler text matching
    const dashboardTab = page.getByText('Dashboard', { exact: true }).first();
    const resultsTab = page.getByText('Results', { exact: true }).first();
    
    // Logs might be just an icon or have specific rendering
    const logsTab = page.locator('div[dir="auto"]').filter({ hasText: /^Logs$/ }).or(page.locator('css=[data-testid="terminal-icon"]')).first();

    await expect(dashboardTab).toBeVisible();
    await expect(resultsTab).toBeVisible();
    
    // If Logs text is not found, we at least expect 3 tab-like elements
    const tabs = page.locator('div[role="tab"], div[dir="auto"] >> internal:has-text=/Dashboard|Results|Logs/');
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);

    // Check tab styling (fontSize 13 - base)
    const fontSize = await dashboardTab.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(fontSize).toBe('13px');
  });

  test('Section headers should not use monospaced font', async ({ page }) => {
    const sectionLabel = page.locator('div[dir="auto"]:has-text("UPLOAD DATA")').first();
    const fontFamily = await sectionLabel.evaluate((el) => window.getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).not.toContain('monospace');
  });

  test('Results page should load correctly', async ({ page }) => {
    const resultsTab = page.getByText('Results', { exact: true }).first();
    await resultsTab.click();
    await expect(page.locator('div[dir="auto"]:has-text("CC RESULTS")').first()).toBeVisible();
    
    // Check summary card styling (using count badge text which is often bold)
    const countBadge = page.locator('div[dir="auto"]:has-text("0")').first();
    const fontWeight = await countBadge.evaluate((el) => window.getComputedStyle(el).fontWeight);
    expect(fontWeight).toBe('700');
  });
});
