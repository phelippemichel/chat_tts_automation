const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); 

const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

(async () => {
  let browser;
  try {

    const records = await readCSV('output.csv');
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'audio/mpeg',
      'Connection': 'keep-alive',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Content-Type': 'application/json',
      'Origin': 'https://pi.ai'
    });

    await page.setCookie({
      name: '__Host-session',
      value: 'iwJrHTN4CFyx4CdVWNs5w',
      domain: 'pi.ai',
      path: '/',
      sameSite: 'Lax',
      secure: true
    }, {
      name: '__cf_bm',
      value: 'r8LQw3bq2NTjtwfYGPXJnFzr2Wk9lgSBZ1m4gXKN1tw-1725293908-1.0.1.1-WPQgPDxasPWduotFZ27sCaJVATE7S7mzkAcK4CY8PEpi7WImblGQj3IH7YXxV.4kfBU3ImtkoWHX7E4.WpmOkg',
      domain: '.pi.ai',
      path: '/',
      sameSite: 'None',
      secure: true
    });

    await page.goto('https://pi.ai', { waitUntil: 'networkidle2', timeout: 60000 });
    let counter = 1;
    for (const record of records) {
      const voiceUrl = record[' url'];
      const messageSid = record.sid;

      const audioContent = await page.evaluate(async (url) => {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'audio/mpeg',
            'Origin': 'https://pi.ai'
          }
        });
        const buffer = await response.arrayBuffer(); 
        return Array.from(new Uint8Array(buffer)); 
      }, voiceUrl);

      
      const fileName = `${counter}.mp3`;
      fs.writeFileSync(path.join(__dirname, fileName), Buffer.from(audioContent));

      console.log(`Áudio salvo como ${fileName}.`);
      counter++;
    }

  } catch (error) {
    console.error('Erro ao navegar ou executar o script:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();