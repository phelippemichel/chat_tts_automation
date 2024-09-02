const fs = require('fs');
const path = require('path');
const axios = require('axios');
const csv = require('csv-parser');

const downloadFile = async (url, filePath) => {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://pi.ai/talk',
        'Origin': 'https://pi.ai',
        'Cookie': '__Host-session=fWNeJZGfvxVh56NfXkLoC; __cf_bm=IU_In..Lj.faOCycTl46b0DvrfG.hGndFpiWYs7bgUc-1725292022-1.0.1.1-79CdfNzAgLKP57WRkCnULuJZQ3BNqAeUZCmFDa1Mu1XQnz7r6cktD8_hq20ZE5YzeQhREjwNznZMeo7ba4.rOw'
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading file from ${url}:`, error);
  }
};

const processCSV = async () => {
  const csvFilePath = path.join(__dirname, 'output.csv');
  const downloadsDir = path.join(__dirname, 'downloads');

  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
  }

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', async (row) => {
      const sid = row.sid.trim();
      const url = row[' url']?.trim(); // Use the correct column name and trim extra spaces

      if (!url) {
        console.error('URL is missing in row:', row);
        return;
      }

      const fileName = `${sid}.mp3`;
      const filePath = path.join(downloadsDir, fileName);

      console.log(`Downloading ${fileName} from ${url}`);
      await downloadFile(url, filePath);
      console.log(`Downloaded ${fileName}`);
    })
    .on('end', () => {
      console.log('CSV file processing complete.');
    });
};

processCSV();
