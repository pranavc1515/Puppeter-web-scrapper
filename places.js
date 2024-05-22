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

async function saveCompleteWebPage(url, baseDir = 'scrapped-data') {
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

    // Click all 'Read More' links dynamically
    const readMoreSelectors = '[style*="text-decoration: underline rgb(255, 208, 66);"]'; // Targets all underlined 'Read More' links

    await page.evaluate(selector => {
      document.querySelectorAll(selector).forEach(button => button.click());
    }, readMoreSelectors);

    await page.waitForTimeout(5000); // Wait for the expanded content to load

    const htmlContent = await page.content();
    fs.writeFileSync(filePath, htmlContent);
    console.log(`The file was saved as ${filePath}!`);
  } catch (error) {
    console.error('Error occurred while scraping:', error);
  } finally {
    await browser.close();
  }
}

async function scrapeFromSitemap(sitemapUrl) {
  const urls = await fetchSitemapUrls(sitemapUrl);
  for (const url of urls) {
    await saveCompleteWebPage(url);
  }
}

module.exports = async () => {
  await scrapeFromSitemap('https://www.avathi.com/places/sitemap.xml');
};
