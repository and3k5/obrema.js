const { createServer } = require("http-server");
const portfinder = require('portfinder');
const puppeteer = require('puppeteer');

async function wait(n) {
    return new Promise((res,rej) => setTimeout(() => res(),n));
}

(async () => {
    const server = createServer({ root: "dist", showDir: true });

    portfinder.baseport = 8080;

    const port = await portfinder.getPortPromise();
    
    server.server.listen(port);
    try {
        const browser = await puppeteer.launch();
        try {
            
            const page = await browser.newPage();
            page.on("pageerror", function (err) {
                console.error("pageError",err);
            });
            await page.goto('http://localhost:'+port+"/index.html");
            while (await page.evaluate(() => {
                return window.main.getRunning();
            })) {
                console.log("Still running");
                await wait(1000);
            }

            const success = await page.evaluate(() => {
                return window.main.getSuccess();
            });

            if (success !== true) {
                if (success === undefined) {
                    throw new Error("success is undefined");
                }
                throw success;
            }

            console.log("Works!");
            //await page.screenshot({ path: 'example.png' });
        }
        finally {
            await browser.close();
        }
    }
    finally {
        server.close();
    }
})().then(function () {
    console.log("done");
}).catch(function (a) {
    console.error(a);
});