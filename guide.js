const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');

async function fetchSitemapUrls(sitemapUrl) {
  try {
    const response = await axios.get(sitemapUrl);
    const sitemap = await xml2js.parseStringPromise(response.data);
    const urls = sitemap.urlset.url.map(u => u.loc[0]);
    return urls;
  } catch (error) {
    console.error('Error fetching or parsing sitemap:', error);
    return [];
  }
}

async function saveCompleteWebPage(url, baseDir = 'scrapped-data', retries = 2) {
  const urlPath = new URL(url).pathname;
  const filePath = path.join(__dirname, baseDir, urlPath, 'index.html');
  if (fs.existsSync(filePath)) {
    console.log(`File already exists: ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    timeout: 0
  });

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue();
        }
      });
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 0 });
      await page.waitForSelector('.read-more.prerender-readmore', { visible: true, timeout: 10000 });
      await page.evaluate(() => {
        document.querySelectorAll('.read-more.prerender-readmore').forEach(button => button.click());
      });
      await page.waitForTimeout(5000);
      const htmlContent = await page.content();
      fs.writeFileSync(filePath, htmlContent);
      console.log(`The file was saved as ${filePath}!`);
      break; // Break the loop if page was saved successfully
    } catch (error) {
      console.error(`Error occurred while scraping ${url} on attempt ${attempt + 1}:`, error);
      if (attempt === retries) {
        console.error(`Failed to scrape ${url} after ${retries + 1} attempts.`);
      }
    }
    attempt++;
  }

  await browser.close();
}

async function scrapeFromSitemap(sitemapUrl) {
  const urls = await fetchSitemapUrls(sitemapUrl);
  for (const url of urls) {
    await saveCompleteWebPage(url);
  }
}

module.exports = async () => {
  await scrapeFromSitemap('https://www.avathi.com/guide/sitemap.xml');
};
