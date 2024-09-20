const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTranslation(page, text) {
  const url = 'https://pi.ai/api/chat';
  const data = {
    "text": `traduza para espanhol:\n${text}`,
    "conversation": "vSGNmRxZtRokGXkakFTBm"
  };

  const headers = {
    'Accept': 'text/event-stream',
    'Content-Type': 'application/json',
    'Origin': 'https://pi.ai',
    'Referer': 'https://pi.ai/talk',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  };

  try {
    const response = await page.evaluate(async (url, data, headers) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
      });
      return await res.text();
    }, url, data, headers);

    return response;
  } catch (error) {
    console.error('Error fetching translation:', error);
    return null;
  }
}

async function parseResponse(responseText) {
  try {
    const matches = responseText.match(/event: (\w+)\ndata: ({.*?})/g);

    if (matches) {
      for (const match of matches) {
        const [, eventType, jsonData] = match.match(/event: (\w+)\ndata: ({.*?})/);
        if (eventType === 'message') {
          return JSON.parse(jsonData);
        }
      }
    }
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
  return { sid: 'unknown' };
}

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set headers and cookies
    await page.setUserAgent('Mozilla/5.0...');
    await page.setExtraHTTPHeaders({
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/event-stream',
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
    });

    await page.goto('https://pi.ai', { waitUntil: 'domcontentloaded', timeout: 60000 });

    const fileContent = await fs.readFile('archive/text.txt', 'utf8');
    const paragraphs = fileContent.split('#');
    let csvContent = 'sid, url\n';

    for (const paragraph of paragraphs) {
      const responseText = await fetchTranslation(page, paragraph);
      console.log('Response text:', responseText);

      const responseObject = await parseResponse(responseText);
      const sid = responseObject.sid || 'unknown';
      const voiceUrl = `https://pi.ai/api/chat/voice?mode=eager&voice=voice3&messageSid=${sid}`;
      csvContent += `${sid}, ${voiceUrl}\n`;

      await delay(2000);
    }

    await fs.writeFile(path.join(__dirname, 'output.csv'), csvContent, 'utf8');
    console.log('CSV file saved.');
  } catch (error) {
    console.error('Error navigating or executing the script:', error);
  } finally {
    if (browser) await browser.close();
  }
})();