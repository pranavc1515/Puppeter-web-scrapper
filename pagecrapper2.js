const puppeteer = require('puppeteer');

async function saveCompleteWebPage(url, filePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForTimeout(10000);
  const htmlContent = await page.content();
  const fs = require('fs');
  fs.writeFile(filePath, htmlContent, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log(`The file was saved as ${filePath}!`);
  });
  await browser.close();
}


saveCompleteWebPage('https://www.avathi.com/stories/dark-sky-parks-and-reserve-in-india/109', 'avathi.html');
