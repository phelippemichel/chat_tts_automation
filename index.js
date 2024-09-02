const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    // Adiciona cabeçalhos necessários
    await page.setExtraHTTPHeaders({
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/event-stream',
      'Connection': 'keep-alive',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Content-Type': 'application/json',
      'Origin': 'https://pi.ai'
    });

    // Define os cookies
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

    // Lê o conteúdo do arquivo
    const fileContent = await fs.readFile('/home/phe/dev/chat_automation/archive/text.txt', 'utf8');

    // Separa o conteúdo por parágrafos
    const paragraphs = fileContent.split('#');

    // Prepara o conteúdo CSV
    let csvContent = 'sid, url\n';

    for (const paragraph of paragraphs) {
        const responseText = await page.evaluate(async (text) => {
          const url = 'https://pi.ai/api/chat';
          const data = {
            "text": `${text}`,
            "conversation": "sZy322np39XiRivba1zo5" // Verifique se esse valor está correto
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
            return await response.text();
          } catch (error) {
            console.error('Error in fetch:', error);
            return 'Error occurred during fetch';
          }
        }, paragraph);
      
        console.log('Response text:', responseText);
      
        let responseObject = { sid: 'unknown' };
        try {
          // Extrai todos os eventos e os dados associados
          const matches = responseText.match(/event: (\w+)\ndata: ({.*?})/g);

          if (matches) {
            // Itera sobre todos os eventos encontrados
            for (const match of matches) {
              const [, eventType, jsonData] = match.match(/event: (\w+)\ndata: ({.*?})/);
              if (eventType === 'message') {
                responseObject = JSON.parse(jsonData);
                break; // Encerra o loop assim que encontrar o evento 'message'
              }
            }
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      
        const sid = responseObject.sid || 'unknown';
        const voiceUrl = `https://pi.ai/api/chat/voice?mode=eager&voice=voice3&messageSid=${sid}`;
      
        // Adiciona a linha ao conteúdo CSV
        csvContent += `${sid}, ${voiceUrl}\n`;
      }

    // Salva o conteúdo CSV em um arquivo
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