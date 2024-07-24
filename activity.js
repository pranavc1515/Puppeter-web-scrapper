const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

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

async function saveToS3(bucketName, key, content) {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: content,
    ContentType: 'text/html'
  };

  try {
    await s3.upload(params).promise();
    console.log(`Successfully uploaded ${key} to ${bucketName}`);
  } catch (error) {
    console.error(`Failed to upload ${key} to ${bucketName}:`, error);
  }
}

async function saveCompleteWebPage(url, browser, baseDir = 'scrapped-data', retries = 3) {
  const urlPath = new URL(url).pathname;
  const filePath = path.join(__dirname, baseDir, urlPath, 'index.html');
  if (fs.existsSync(filePath)) {
    console.log(`File already exists: ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  for (let attempt = 0; attempt < retries; attempt++) {
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
      const readMoreButton = '.prerender-readmore';
      const readMoreExists = await page.$(readMoreButton);
      if (readMoreExists) {
        await page.click(readMoreButton);
        await page.waitForTimeout(5000);
      }
      const htmlContent = await page.content();
      fs.writeFileSync(filePath, htmlContent);
      console.log(`The file was saved as ${filePath}!`);

      // Upload to S3
      const s3Key = path.relative(__dirname, filePath).replace(/\\/g, '/'); // Convert Windows backslashes to forward slashes for S3
      await saveToS3(process.env.S3_BUCKET_NAME, s3Key, htmlContent);

      await page.close();
      return; 
    } catch (error) {
      console.error(`Error occurred while scraping ${url} on attempt ${attempt + 1}:`, error);
      if (attempt === retries - 1) {
        console.error(`Failed to scrape ${url} after ${retries} attempts.`);
      }
    }
  }
}

async function scrapeFromSitemap(sitemapUrl, concurrency = 5) {
  const urls = await fetchSitemapUrls(sitemapUrl);
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (let i = 0; i < urls.length; i += concurrency) {
      const chunk = urls.slice(i, i + concurrency);
      await Promise.all(chunk.map(url => saveCompleteWebPage(url, browser)));
    }
  } finally {
    await browser.close();
  }
}

module.exports = async () => {
  await scrapeFromSitemap('https://www.avathi.com/activity/sitemap.xml');
};
