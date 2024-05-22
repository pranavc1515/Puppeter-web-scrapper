const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const axios = require('axios');
const xml2js = require('xml2js');

const sitemapUrls = [
  "https://www.avathi.com/static_pages/sitemap.xml",
  "https://www.avathi.com/stories/sitemap.xml",
];

async function fetchSitemapUrls(sitemapUrl) {
  const response = await axios.get(sitemapUrl);
  const parsed = await xml2js.parseStringPromise(response.data);
  return parsed.urlset.url.map(u => u.loc[0]);
}

async function saveCompleteWebPage(browser, url, filePath, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000); 
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(5000); 
      const htmlContent = await page.content();
      fs.writeFileSync(filePath, htmlContent);
      console.log(`The file was saved as ${filePath}!`);
      return;
    } catch (error) {
      console.error(`Error scraping ${url} on attempt ${attempt + 1}: ${error}`);
    } finally {
      await page.close();
    }
  }
  console.error(`Failed to scrape ${url} after ${retries} attempts.`);
}

async function scrapeUrls(browser, urls) {
  for (const url of urls) {
    const parsedUrl = new URL(url);
    const route = parsedUrl.pathname.substring(1).replace(/\/$/, ''); // Remove trailing slash
    const filePath = path.join(__dirname, 'scrapped-data', route, 'index.html');
    const directoryPath = path.dirname(filePath);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      console.log(`Scraping ${url}...`);
      await saveCompleteWebPage(browser, url, filePath);
    } else {
      console.log(`${url} has already been scraped.`);
    }
  }
}

async function scrapeAllPages() {
  const browser = await puppeteer.launch({
    headless: true, 
    args: ['--no-sandbox'], 
  });
  try {
    for (const sitemapUrl of sitemapUrls) {
      const urls = await fetchSitemapUrls(sitemapUrl);
      await scrapeUrls(browser, urls);
    }
  } catch (error) {
    console.error(`Error scraping all pages: ${error}`);
  } finally {
    await browser.close();
  }
}

module.exports = async () => {
  await scrapeAllPages();
};
