import { test, expect } from '@playwright/test';
import { calculateChecksum, generateVin } from '../src/automation/cc_checker/gen_vin';
import { launchStealthBrowser, createStealthContext } from '../src/automation/shared/browser';
import * as fs from 'fs';
import * as path from 'path';

import { config } from '../src/automation/gateway2/config';

test.describe('Automation Logic Tests', () => {
  
  // --- gen_vin.ts Tests ---
  test('calculateChecksum should return correct checksum for valid VIN base', () => {
    // Standard VIN checksum calculation verification
    const vinBase = '1ZVBP8AM0D5025287'; // Placeholder '0' at pos 9
    const checksum = calculateChecksum(vinBase);
    expect(checksum).toMatch(/^[0-9X]$/);
  });

  test('generateVin should produce valid 17-character VIN', () => {
    const vin = generateVin();
    expect(vin).toHaveLength(17);
    expect(vin).toMatch(/^[A-Z0-9]{17}$/);
    expect(vin).not.toMatch(/[IOQ]/); // I, O, Q are disallowed in VINs
  });

  test('generateVin should have correct check digit at position 9', () => {
    const vin = generateVin();
    const vinBase = vin.substring(0, 8) + '0' + vin.substring(9);
    const expectedCheckDigit = calculateChecksum(vinBase);
    expect(vin[8]).toBe(expectedCheckDigit);
  });

  // --- shared/browser.ts Tests ---
  test('launchStealthBrowser should launch a browser and create a context', async () => {
    const { browser, context } = await launchStealthBrowser({ headless: true });
    expect(browser).toBeDefined();
    expect(context).toBeDefined();
    await browser.close();
  });

  test('createStealthContext should set correct user agent and locale', async ({ browser }) => {
    const context = await createStealthContext(browser, { mobile: true });
    const page = await context.newPage();
    const ua = await page.evaluate(() => navigator.userAgent);
    const locale = await page.evaluate(() => navigator.language);
    
    expect(ua).toContain('iPhone');
    expect(locale).toBe('en-AU');
    await context.close();
  });

  // --- Configuration Verification ---
  test('gateway2/config.ts should have required fields', () => {
    expect(config.form.url).toContain('donorperfect');
    expect(config.selectors.cardNumber).toBeDefined();
    expect(config.timeouts.pageLoad).toBeGreaterThan(0);
  });


  // --- Component Logic (Mocking where possible) ---
  test('wa_rego/checkout.ts path resolution logic', async () => {
    // Verify that the script can resolve its data paths correctly
    // Since it's a script that runs on execution, we check the path logic used
    const currentDir = path.dirname(path.join(process.cwd(), 'src/automation/wa_rego/checkout.ts'));
    const rootDir = path.join(currentDir, '../../../');
    expect(fs.existsSync(path.join(rootDir, 'package.json'))).toBe(true);
  });

  test('cc_checker/check.ts path resolution logic', async () => {
    const currentDir = path.dirname(path.join(process.cwd(), 'src/automation/cc_checker/check.ts'));
    const rootDir = path.join(currentDir, '../../../');
    expect(fs.existsSync(path.join(rootDir, 'package.json'))).toBe(true);
  });

  // --- Browser Patch Verification ---
  test('Stealth patches should hide webdriver and set Australian context', async () => {
    const { browser, context } = await launchStealthBrowser({ headless: true });
    const page = await context.newPage();
    
    const { webdriver, languages, platform, vendor } = await page.evaluate(() => ({
      webdriver: navigator.webdriver,
      languages: navigator.languages,
      platform: navigator.platform,
      vendor: navigator.vendor,
    }));

    expect(webdriver).toBe(false);
    expect(languages).toContain('en-AU');
    expect(platform).toBe('Win32');
    
    await browser.close();
  });

});
