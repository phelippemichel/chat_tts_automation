const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');


const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
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
    }, {
      name: '__cf_bm',
      value: 'OOBEGduxKwNYHD43R2Z5Is6nmxFJOhdy7WdtAYNsQXY-1726605354-1.0.1.1-rl0d0sTnEHnDPuztOIzUcfaXQfbuPLM8xY.elck4gJ_IO9kEStMRE49XpL1YbIJA9NkwHS9mSnjQw7zwkp3a9g',
      domain: '.pi.ai',
      path: '/',
      sameSite: 'None',
      secure: true
    });

    await page.goto('https://pi.ai', { waitUntil: 'networkidle2', timeout: 60000 });
    const fileContent = await fs.readFile('archive/text.txt', 'utf8');
    const paragraphs = fileContent.split('#');

    let csvContent = 'sid, url\n';

    for (const paragraph of paragraphs) {
        const responseText = await page.evaluate(async (text) => {
          const url = 'https://pi.ai/api/chat';
          const data = {
            "text": `traduza para espanhol:\n${text}"`,
            "conversation": "vSGNmRxZtRokGXkakFTBm"
          };

          const headers = {
            'Accept': 'text/event-stream',
            'Content-Type': 'application/json',
            'Origin': 'https://pi.ai',
            'Referer': 'https://pi.ai/talk',
            'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Linux"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
          };

          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(data)
            });
            
            if (response.status === 429) {
              console.log('Too Many Requests, waiting...');
              await delay(60000);
              return 'Error: Too Many Requests';
            }

            return await response.text();
          } catch (error) {
            console.error('Error in fetch:', error);
            return 'Error occurred during fetch';
          }
        }, paragraph);

        console.log('Response text:', responseText);

        let responseObject = { sid: 'unknown' };
        try {
          const matches = responseText.match(/event: (\w+)\ndata: ({.*?})/g);

          if (matches) {
            for (const match of matches) {
              const [, eventType, jsonData] = match.match(/event: (\w+)\ndata: ({.*?})/);
              if (eventType === 'message') {
                responseObject = JSON.parse(jsonData);
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }

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
    if (browser) {
      await browser.close();
    }
  }
})();
