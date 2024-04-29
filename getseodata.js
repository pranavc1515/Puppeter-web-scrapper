const puppeteer = require("puppeteer");
const fs = require('fs').promises; // Import the file system module correctly

async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to page
    await page.goto('https://www.avathi.com/');

    // SEO related data
    const title = await page.title();
    const metaDescription = await page.$eval('meta[name="description"]', (element) => element.textContent);
    // const metaKeywords = await page.$eval('meta[name="keywords"]', (element) => element.textContent);

    // Extract Links
    const links = await page.$$eval("a", (elements) => elements.map((element) => ({
        href: element.href,
        text: element.textContent.trim()
    })));

    // Extract Images
    const images = await page.$$eval("img", (elements) => elements.map((element) => ({
        src: element.src,
        alt: element.alt
    })));

    // Take counts of the images and links
    const imageCount = images.length;
    const linkCount = links.length;

    // Prepare output format
    const outputData = {
        title,
        metaDescription,
       
        images,
        links,
        imageCount,
        linkCount
    };

    // Convert JSON into string
    const outputJSON = JSON.stringify(outputData, null, 2);

    try {
        await fs.writeFile("output.json", outputJSON); // Write file asynchronously
        console.log("Data has been scraped and saved to output.json");
    } catch (err) {
        console.error("Error writing to file:", err);
    }

    await browser.close();
}

run();
