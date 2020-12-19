const axios = require('axios');
const fs = require('fs-extra');

const blockHashList = require('./hashList.json');
fs.ensureFileSync('nextSuccessfulBlockHash.txt');

let nextSuccessfulBlockHash = fs.readFileSync(
  'nextSuccessfulBlockHash.txt',
  'utf-8'
);
let index = 0;

if (nextSuccessfulBlockHash) {
  index = blockHashList.findIndex((hash) => {
    return nextSuccessfulBlockHash === hash;
  });
}

if (index) {
  console.log('Continuing from index: ' + index);
}

const BASE_URL = 'https://blockchain.info/rawblock';
const outputFilename = 'bitcoin-transactions.csv';

(async () => {
  for (; index < blockHashList.length; index++) {
    const hash = blockHashList[index];

    fs.writeFileSync('nextSuccessfulBlockHash.txt', hash);
    nextSuccessfulBlockHash = hash;

    const url = `${BASE_URL}/${hash}`;

    try {
      console.log(`Fetching ${url}...`);
      const response = await axios.get(url);
      const data = response.data;

      // const block = {
      //   hash,
      //   time: data.time,
      //   fee: data.fee,
      //   transaction_count: data.n_tx,
      //   size: data.size,
      //   height: data.height,
      //   weight: data.weight,
      // };

      const transactions = data.tx;

      for (const transaction of transactions) {
        const inputs = transaction.inputs;

        let skipTransaction = false;

        let inputsString = '';

        for (const input of inputs) {
          if (!input.prev_out) {
            skipTransaction = true;
            break;
          }

          const address = input.prev_out.addr;
          const value = input.prev_out.value;

          if (address && value) {
            inputsString += `${address}:${value};`;
          }
        }

        inputsString = inputsString.substring(0, inputsString.length - 1);

        if (skipTransaction) {
          console.log('Reward transaction - skip');
          continue;
        }

        let outputsString = '';

        const outputs = transaction.out;

        for (const output of outputs) {
          const address = output.addr;
          const value = output.value;

          if (address && value) {
            outputsString += `${address}:${value};`;
          }
        }

        outputsString = outputsString.substring(0, outputsString.length - 1);

        const formattedTransaction = {
          block_hash: hash,
          tx_fee: transaction.fee,
          tx_time: transaction.time,
          tx_size: transaction.size,
          tx_weight: transaction.weight,
          tx_inputs: inputsString,
          tx_outputs: outputsString,
        };

        if (!fs.existsSync(outputFilename)) {
          let headers = Object.keys(formattedTransaction).reduce((sum, key) => {
            sum += key + ',';

            return sum;
          }, '');
          headers = headers.substring(0, headers.length - 1) + '\n';

          fs.writeFileSync(outputFilename, headers);
        }

        const csvLine = `"${removeNewLinesAndQuotes(
          formattedTransaction.block_hash
        )}",${formattedTransaction.tx_fee},${formattedTransaction.tx_time},${
          formattedTransaction.tx_size
        },"${formattedTransaction.tx_weight}","${removeNewLinesAndQuotes(
          formattedTransaction.tx_inputs
        )}","${removeNewLinesAndQuotes(formattedTransaction.tx_outputs)}"\n`;

        fs.appendFileSync(outputFilename, csvLine);
      }

      debugger;
    } catch (error) {
      console.log(error);
      // wait and re-try later
    }
  }
})();

function removeNewLinesAndQuotes(value) {
  const noNewLines = value.replace(/\n/g, ' ');
  const newValue = noNewLines.replace(/"/g, '');

  return newValue;
}
