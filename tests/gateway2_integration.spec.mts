import { test, expect } from '@playwright/test';
import { config } from '../src/automation/gateway2/config';

test.describe('Gateway2 Integration Tests', () => {

  test.describe('Crawler Utilities', () => {
    test('cleanGoogleRedirect handles various formats', async () => {
      const crawl = await import('../src/automation/gateway2/crawl');
      expect(crawl.cleanGoogleRedirect('/url?q=https://example.com')).toBe('https://example.com');
      expect(crawl.cleanGoogleRedirect('https://example.com')).toBe('https://example.com');
      expect(crawl.cleanGoogleRedirect(null)).toBeNull();
    });

    test('isValidDpUrl validates DonorPerfect URLs', async () => {
      const crawl = await import('../src/automation/gateway2/crawl');
      expect(crawl.isValidDpUrl('https://wl.donorperfect.net/weblink.aspx')).toBe(true);
      expect(crawl.isValidDpUrl('https://google.com')).toBe(false);
    });

    test('extractSearchResults finds links in mock HTML', async ({ page }) => {
      const crawl = await import('../src/automation/gateway2/crawl');
      await page.setContent(`
        <a href="/url?q=https://wl.donorperfect.net/test1"><h3>Link 1</h3></a>
        <ol id="b_results">
          <li class="b_algo"><a href="https://wl.donorperfect.net/test2">Link 2</a></li>
        </ol>
      `);
      
      const googleResults = await crawl.extractSearchResults(page, 'google');
      expect(googleResults).toContain('https://wl.donorperfect.net/test1');
      
      const bingResults = await crawl.extractSearchResults(page, 'bing');
      expect(bingResults).toContain('https://wl.donorperfect.net/test2');
    });
  });

  test.describe('Form Automation Helpers', () => {
    test('safeFill should populate an input field', async ({ page }) => {
      const check = await import('../src/automation/gateway2/check');
      await page.setContent('<input id="test-input" />');
      const success = await check.safeFill(page, '#test-input', 'test-value', 'Test Input');
      expect(success).toBe(true);
      const val = await page.inputValue('#test-input');
      expect(val).toBe('test-value');
    });

    test('safeSelect should select an option', async ({ page }) => {
      const check = await import('../src/automation/gateway2/check');
      await page.setContent(`
        <select id="test-select">
          <option value="1">One</option>
          <option value="2">Two</option>
        </select>
      `);
      const success = await check.safeSelect(page, '#test-select', '2', 'Test Select');
      expect(success).toBe(true);
      const val = await page.inputValue('#test-select');
      expect(val).toBe('2');
    });

    test('safeClick should click a button', async ({ page }) => {
      const check = await import('../src/automation/gateway2/check');
      await page.setContent('<button id="test-btn" onclick="window.clicked=true">Click Me</button>');
      const success = await check.safeClick(page, '#test-btn', 'Test Button');
      expect(success).toBe(true);
      const clicked = await page.evaluate(() => (window as any).clicked);
      expect(clicked).toBe(true);
    });
  });

  test.describe('Process Form Logic', () => {
    test('processForm should handle a successful flow mock', async ({ page }) => {
      const check = await import('../src/automation/gateway2/check');
      // Mock a DonorPerfect-like form
      await page.setContent(`
        <form id="divForm">
          <input type="radio" id="GPOtherAmountRbl" />
          <input id="GPOtherAmountTxt" />
          <input id="rdoGiftPledgeType_0" type="radio" />
          <input id="first_name_ucTxtBox" />
          <input id="last_name_ucTxtBox" />
          <input id="address_ucTxtBox" />
          <input id="city_ucTxtBox" />
          <select id="state_ucDDL"><option value="NY">NY</option></select>
          <select id="country_ucDDL"><option value="US">US</option></select>
          <input id="zip_ucTxtBox" />
          <input id="email_ucEmail" />
          <input id="CardHolderName_ucTxtBox" />
          <input id="CardAccountNum_ucNumericTxt" />
          <select id="ExpirationDate_ucExpirationMonth"><option value="01">01</option></select>
          <select id="ExpirationDate_ucExpirationYear"><option value="2028">2028</option></select>
          <input id="CVV2_ucNumericTxt" />
          <input id="SetInfo" type="checkbox" />
          <input id="CardHolderAddress_ucTxtBox" />
          <input id="CardHolderCity_ucTxtBox" />
          <select id="CardHolderState_ucDDL"><option value="NY">NY</option></select>
          <select id="CardHolderCountry_ucDDL"><option value="US">US</option></select>
          <input id="CardHolderZip_ucTxtBox" />
          <input id="ucRblOptionalContribution_0" type="radio" />
          <input value="Next" type="button" id="btnNext" />
          <input value="Submit" type="button" id="btnSubmit" />
        </form>
      `);

      // Mock navigation and success result
      await page.route(config.form.url, route => route.fulfill({ body: '<html><body>Mock Form</body></html>' }));
      
      // Override next/submit behavior to avoid actual navigation
      await page.evaluate(() => {
        document.getElementById('btnNext')?.addEventListener('click', () => {
           // stay on page for mock
        });
        document.getElementById('btnSubmit')?.addEventListener('click', () => {
           document.body.innerHTML = '<h1>Thank You for your donation</h1>';
        });
      });

      const donor = {
        first: "Test", last: "User", address: "123 Test St", city: "Test City",
        state: "NY", country: "USA", zip: "12345", email: "test@example.com"
      };
      
      const status = await check.processForm(page, "4000111122223333|01|2028|123", donor, 1);
      expect(status).toBe('SUCCESS');
    });

    test('processForm should handle a failure flow mock', async ({ page }) => {
        const check = await import('../src/automation/gateway2/check');
        await page.setContent(`
          <form id="divForm">
            <input type="radio" id="GPOtherAmountRbl" />
            <input id="GPOtherAmountTxt" />
            <input id="rdoGiftPledgeType_0" type="radio" />
            <input id="first_name_ucTxtBox" />
            <input id="last_name_ucTxtBox" />
            <input id="address_ucTxtBox" />
            <input id="city_ucTxtBox" />
            <select id="state_ucDDL"><option value="NY">NY</option></select>
            <select id="country_ucDDL"><option value="US">US</option></select>
            <input id="zip_ucTxtBox" />
            <input id="email_ucEmail" />
            <input id="CardHolderName_ucTxtBox" />
            <input id="CardAccountNum_ucNumericTxt" />
            <select id="ExpirationDate_ucExpirationMonth"><option value="01">01</option></select>
            <select id="ExpirationDate_ucExpirationYear"><option value="2028">2028</option></select>
            <input id="CVV2_ucNumericTxt" />
            <input id="SetInfo" type="checkbox" />
            <input id="CardHolderAddress_ucTxtBox" />
            <input id="CardHolderCity_ucTxtBox" />
            <select id="CardHolderState_ucDDL"><option value="NY">NY</option></select>
            <select id="CardHolderCountry_ucDDL"><option value="US">US</option></select>
            <input id="CardHolderZip_ucTxtBox" />
            <input id="ucRblOptionalContribution_0" type="radio" />
            <input value="Next" type="button" id="btnNext" />
            <input value="Submit" type="button" id="btnSubmit" />
            <div id="2" style="display:none">Sorry, there was an error processing the donation.</div>
          </form>
        `);
  
        await page.evaluate(() => {
          document.getElementById('btnSubmit')?.addEventListener('click', () => {
             (document.getElementById('2') as HTMLElement).style.display = 'block';
             document.body.innerHTML += '<div>declined</div>';
          });
        });
  
        const donor = {
          first: "Test", last: "User", address: "123 Test St", city: "Test City",
          state: "NY", country: "USA", zip: "12345", email: "test@example.com"
        };
        
        const status = await check.processForm(page, "4000111122223333|01|2028|123", donor, 1);
        expect(status).toBe('FAIL');
      });
  });

});
