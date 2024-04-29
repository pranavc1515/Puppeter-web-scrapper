const puppeteer = require("puppeteer");
const fs = require('fs').promises;
const path = require('path');

async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to page
    await page.goto('https://www.avathi.com/');

    // Get full HTML content of the page
    const htmlContent = await page.content();

    // Create a folder for HTML content
    const htmlFolder = './html';

    // Ensure the folder exists, if not create it
    await fs.mkdir(htmlFolder, { recursive: true });

    // Save HTML content to a file
    await fs.writeFile(path.join(htmlFolder, 'page.html'), htmlContent);

    console.log("HTML content has been scraped and saved to html/page.html");

    await browser.close();
}

run();