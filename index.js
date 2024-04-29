const puppeteer = require("puppeteer");

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: false })
        const page = await browser.newPage();
        await page.goto('https://www.google.com/');
        await page.screenshot({path: 'goggle.png'});
        await browser.close();

    } catch (err) {
        console.log(err)
    }
})();