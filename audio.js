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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchAudio = async (url, retries = 3) => {
  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'audio/mpeg',
          'Origin': 'https://pi.ai'
        }
      });
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Status: ${response.status}`);
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch audio. Status: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      return Array.from(new Uint8Array(buffer));
    } catch (error) {
      console.error(`Erro ao baixar áudio: ${error.message}`);
      retries -= 1;
      if (retries > 0) {
        console.log(`Tentando novamente em 5 segundos...`);
        await delay(5000);
      } else {
        throw error;
      }
    }
  }
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
      value: 'HYqm76BJfhndaneu7BpjR',
      domain: 'pi.ai',
      path: '/',
      sameSite: 'Lax',
      secure: true
    }, {
      name: '__cf_bm',
      value: 'OOBEGduxKwNYHD43R2Z5Is6nmxFJOhdy7WdtAYNsQXY-1726605354-1.0.1.1-rl0d0sTnEHnDPuztOIzUcfaXQfbuPLM8xY.elck4gJ_IO9kEStMRE49XpL1YbIJA9NkwHS9mSnjQw7zwkp3a9g',
      domain: '.pi.ai',
      path: '/',
      sameSite: 'None',
      secure: true
    });

    await page.goto('https://pi.ai', { waitUntil: 'networkidle2', timeout: 60000 });

    const audioDir = path.join(__dirname, 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir);
    }

    let counter = 1;
    for (const record of records) {
      const voiceUrl = record[' url'];
      const messageSid = record.sid;

      try {
        const audioContent = await page.evaluate(fetchAudio, voiceUrl);

        const fileName = `${counter}.mp3`;
        const filePath = path.join(audioDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(audioContent));

        console.log(`Áudio salvo como ${filePath}.`);
      } catch (error) {
        console.error(`Erro ao salvar áudio para SID ${messageSid}: ${error.message}`);
      }

      counter++;
      await delay(1000);
    }

  } catch (error) {
    console.error('Erro ao navegar ou executar o script:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
