const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const axios = require("axios");
const xml2js = require("xml2js");
const AWS = require("aws-sdk");
require("dotenv").config();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const sitemapUrls = [
  "https://www.avathi.com/static_pages/sitemap.xml",
  "https://www.avathi.com/stories/sitemap.xml",
  "https://www.avathi.com/best-time-to-visit/sitemap.xml",
  "https://www.avathi.com/how-to-get-there/sitemap.xml",
  "https://www.avathi.com/things-to-do/sitemap.xml",
  "https://www.avathi.com/place/sitemap.xml",
  "https://www.avathi.com/activity/sitemap.xml",
  "https://www.avathi.com/places-to-visit/sitemap.xml",
];

async function fetchSitemapUrls(sitemapUrl) {
  const response = await axios.get(sitemapUrl);
  const parsed = await xml2js.parseStringPromise(response.data);
  return parsed.urlset.url.map((u) => u.loc[0]);
}

async function saveToS3(bucketName, key, content) {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: content,
    ContentType: "text/html",
  };

  try {
    await s3.upload(params).promise();
    console.log(`Successfully uploaded ${key} to ${bucketName}`);
  } catch (error) {
    console.error(`Failed to upload ${key} to ${bucketName}:`, error);
  }
}

async function saveCompleteWebPage(browser, url, filePath, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000); // Set navigation timeout to 60 seconds
    try {
      await page.goto(url, { waitUntil: "networkidle0" });
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds to ensure the page loads completely

      const htmlContent = await page.content();
      fs.writeFileSync(filePath, htmlContent);
      console.log(`The file was saved as ${filePath}!`);

      // Upload to S3
      const s3Key = path.relative(__dirname, filePath).replace(/\\/g, "/"); // Convert Windows backslashes to forward slashes for S3
      await saveToS3(process.env.S3_BUCKET_NAME, s3Key, htmlContent);

      return;
    } catch (error) {
      console.error(
        `Error scraping ${url} on attempt ${attempt + 1}: ${error}`
      );
    } finally {
      await page.close();
    }
  }
  console.error(`Failed to scrape ${url} after ${retries} attempts.`);
}

async function scrapeUrls(browser, urls, batchSize = 5) {
  const scrapeBatch = async (batch) => {
    return Promise.all(
      batch.map(async (url) => {
        const parsedUrl = new URL(url);
        const route = parsedUrl.pathname.substring(1).replace(/\/$/, "");
        const filePath = path.join(
          __dirname,
          "scrapped-data",
          route,
          "index.html"
        );
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
      })
    );
  };

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await scrapeBatch(batch);
  }
}

async function scrapeAllPages() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  try {
    for (const sitemapUrl of sitemapUrls) {
      const urls = await fetchSitemapUrls(sitemapUrl);
      console.log(`Scraping URLs from ${sitemapUrl}...`);
      await scrapeUrls(browser, urls, 10); // Adjust batch size as needed
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
