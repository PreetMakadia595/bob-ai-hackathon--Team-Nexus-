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
    defaultViewport: { width: 1440, height: 950 }
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

  // 1. Disruptions Page (Blockage Time Window, Cost in INR, Detour Cost Delta, Map)
  console.log('Navigating to http://localhost:3000/disruptions...');
  await page.goto('http://localhost:3000/disruptions', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  const screenDisruptions = path.join(screenshotsDir, '04-disruptions-time-window-cost.png');
  await page.screenshot({ path: screenDisruptions });
  console.log('Captured:', screenDisruptions);

  // 2. Redeployment Page (Condition Check Table with Cost & ETA and Cost Delta action buttons)
  console.log('Navigating to http://localhost:3000/redeployment...');
  await page.goto('http://localhost:3000/redeployment', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  const screenRedeploy = path.join(screenshotsDir, '05-redeployment-condition-cost-eta.png');
  await page.screenshot({ path: screenRedeploy });
  console.log('Captured:', screenRedeploy);

  // 3. Trips Page (Cost in ₹ and ETA columns)
  console.log('Navigating to http://localhost:3000/trips...');
  await page.goto('http://localhost:3000/trips', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  const screenTrips = path.join(screenshotsDir, '06-trips-cost-eta.png');
  await page.screenshot({ path: screenTrips });
  console.log('Captured:', screenTrips);

  await browser.close();
  console.log('✅ All feature showcase screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Error during showcase capture:', err);
  process.exit(1);
});
