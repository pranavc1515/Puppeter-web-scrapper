const puppeteer = require('puppeteer');

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const sitemapUrls = [
  "https://www.avathi.com/experiences/sitemap.xml",
  "https://www.avathi.com/static_pages/sitemap.xml",
  "https://www.avathi.com/activities/sitemap.xml",
  "https://www.avathi.com/stories/sitemap.xml",
  "https://www.avathi.com/places/sitemap.xml",
  "https://www.avathi.com/guide/sitemap.xml",
  "https://www.avathi.com/place/sitemap.xml",
  "https://www.avathi.com/activity/sitemap.xml"
];

async function saveCompleteWebPage(url, filePath) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox'], // Add the --no-sandbox flag
  });
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(600000000);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForTimeout(10000);
  const htmlContent = await page.content();
  fs.writeFile(filePath, htmlContent, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log(`The file was saved as ${filePath}!`);
  });
  await browser.close();
}

async function scrapeAllPages() {
  for (const sitemapUrl of sitemapUrls) {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox'], // Add the --no-sandbox flag
    });
    const page = await browser.newPage();
    await page.goto(sitemapUrl, { waitUntil: 'networkidle0' });
    const sitemapContent = await page.content();
    const urls = sitemapContent.match(/<loc>(.*?)<\/loc>/g).map(loc => loc.replace(/<\/?loc>/g, ''));
    for (const url of urls) {
      const parsedUrl = new URL(url);
      const route = parsedUrl.pathname.substring(1);
      const filePath = path.join(__dirname, 'scraped', route, 'index.html');
      const directoryPath = path.dirname(filePath);
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
      }
      console.log(`Scraping ${url}...`);
      await saveCompleteWebPage(url, filePath);
    }
    await browser.close();
  }
}

scrapeAllPages();
