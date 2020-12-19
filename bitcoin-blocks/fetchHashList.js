const axios = require('axios');
const fs = require('fs-extra');
const moment = require('moment');

const jsonAppendToListService = require('../json-append-to-list-service');

const startTime = 1593561600 * 1000; // July 1st
const endTime = 1598832000 * 1000; // August 31st
const millisecondsPerDay = 86400 * 1000;

const BASE_URL = 'https://blockchain.info/blocks';
const outputFilename = 'hashList.json';

let isFirstItem = false;

if (!fs.existsSync(outputFilename)) {
  fs.ensureFileSync(outputFilename);
  fs.writeFileSync(outputFilename, JSON.stringify([]));
  fs.appendFileSync(outputFilename, '\n');
  isFirstItem = true;
}

let currentTime = startTime;

jsonAppendToListService.open(outputFilename);

(async () => {
  while (currentTime <= endTime) {
    const url = `${BASE_URL}/${currentTime}?format=json`;

    console.log(`Fetching ${url}...`);

    try {
      const response = await axios.get(url);
      const data = response.data;
      const blocks = data.blocks;

      for (const block of blocks) {
        const hash = block.hash;
        // console.log(hash);
        jsonAppendToListService.append(outputFilename, hash, isFirstItem);

        isFirstItem = false;
      }
    } catch (error) {
      console.log(error);
      return;
    }

    currentTime += millisecondsPerDay;
  }

  jsonAppendToListService.close(outputFilename);
})();
