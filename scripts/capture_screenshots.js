const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function capture() {
  const screenshotsDir = path.join(__dirname, '..', 'demo', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  // Set manager session in localStorage
  await page.evaluate(() => {
    localStorage.setItem('supplyshield_user_session', JSON.stringify({
      email: 'manager@supplyshield.com',
      role: 'manager'
    }));
  });

  // Reload to activate session
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));

  // Screenshot 1: Home Dashboard
  const screen1Path = path.join(screenshotsDir, '01-home-dashboard.png');
  await page.screenshot({ path: screen1Path });
  console.log('Captured:', screen1Path);

  // Screenshot 2: Open Bob AI Drawer
  const bobButton = await page.$('button::-p-text(Ask Bob AI)') || await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent.includes('Ask Bob AI'));
  });

  if (bobButton) {
    await bobButton.click();
    await new Promise(r => setTimeout(r, 1500));
    const screen2Path = path.join(screenshotsDir, '02-query-input.png');
    await page.screenshot({ path: screen2Path });
    console.log('Captured:', screen2Path);

    // Screenshot 3: Trigger a query chip
    const chip = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('disruptions') || b.textContent.includes('corridor'));
    });

    if (chip && chip.click) {
      await chip.click();
      console.log('Clicked chip, waiting 6 seconds for response...');
      await new Promise(r => setTimeout(r, 6000));
    }

    const screen3Path = path.join(screenshotsDir, '03-result-output.png');
    await page.screenshot({ path: screen3Path });
    console.log('Captured:', screen3Path);
  } else {
    console.error('Ask Bob AI button not found');
  }

  await browser.close();
  console.log('Finished capturing all screenshots!');
}

capture().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
