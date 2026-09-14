const puppeteer = require('puppeteer-core');
const path = require('path');

async function generatePdf() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const htmlPath = path.join(__dirname, '..', 'presentation', 'slides_source.html');
  const pdfPath = path.join(__dirname, '..', 'presentation', 'slides.pdf');

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log('PDF generated successfully at:', pdfPath);
  await browser.close();
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
