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

async function saveCompleteWebPage(url, baseDir = 'scrapped-data', retries = 3) {
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
  while (attempt < retries) {
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

      // Selector for the 'Read More' button as per your DOM element
      const readMoreButton = '.prerender-readmore';
      const readMoreExists = await page.$(readMoreButton);
      if (readMoreExists) {
        await page.click(readMoreButton);
        await page.waitForTimeout(5000); // Wait for the expanded content to load
      }

      const htmlContent = await page.content();
      fs.writeFileSync(filePath, htmlContent);
      console.log(`The file was saved as ${filePath}!`);
      break; // If successful, exit the retry loop
    } catch (error) {
      console.error(`Error occurred while scraping ${url} on attempt ${attempt + 1}:`, error);
    } finally {
      await browser.close();
    }
    attempt++;
  }
  if (attempt === retries) {
    console.error(`Failed to scrape ${url} after ${retries} attempts.`);
  }
}

async function scrapeFromSitemap(sitemapUrl) {
  const urls = await fetchSitemapUrls(sitemapUrl);
  for (const url of urls) {
    await saveCompleteWebPage(url);
  }
}

module.exports = async () => {
  await scrapeFromSitemap('https://www.avathi.com/places-to-visit/sitemap.xml');
};
