const axios = require('axios');
const fs = require('fs-extra');
const FormData = require('form-data');
const cheerio = require('cheerio');

const jsonAppendToListService = require('../json-append-to-list-service');
const { decode } = require('punycode');

const SERVICE = 'cryptonews';
const BASE_URL = 'https://cryptonews.com';
const SEARCH_URL = `${BASE_URL}/search/`;

(async () => {
  const topic = process.argv[2];

  if (!topic) {
    console.log('Please pass a topic');
    return;
  }

  const outputFilename = `${SERVICE}_${topic}_post_list.json`;

  let isFirstPost = false;

  if (!fs.existsSync(outputFilename)) {
    fs.ensureFileSync(outputFilename);
    fs.writeFileSync(outputFilename, JSON.stringify([]));
    fs.appendFileSync(outputFilename, '\n');
    isFirstPost = true;
  }

  jsonAppendToListService.open(outputFilename);

  let currentOffset = 0;

  const url = `${SEARCH_URL}?q=${topic}`;

  while (true) {
    let response;

    const formData = buildForm(currentOffset, topic);

    console.log(`Fetching ${url} with an offset of ${currentOffset}`);

    try {
      response = await axios.post(url, formData, {
        headers: formData.getHeaders(),
      });
      const data = response.data;

      if (data.pages.length === 0) {
        console.log('end');
        break;
      }

      const pages = data.pages[0];

      if (currentOffset === 0) {
        currentOffset = 24;
      } else if (currentOffset >= 24) {
        currentOffset = data.offset;
      }

      const div = `<div>${pages}</div>`;

      // const decodedHtml = decodeURIComponent(div);

      const $ = cheerio.load(div);

      const articles = $('.article');

      for (let i = 0; i < articles.length; i++) {
        const articleMeta = articles[i];

        const urlElement = $('a', articleMeta);
        const href = urlElement[0].attribs.href;
        const url = `${BASE_URL}${href}`;

        const timeElement = $('time', articleMeta);

        const publishDatetime = timeElement[0].attribs.datetime;
        const category = cheerio.text($(urlElement[1]));
        const title = cheerio.text($(urlElement[2]));

        const post = { title, url, publishDatetime, category };

        jsonAppendToListService.append(outputFilename, post, isFirstPost);

        isFirstPost = false;
      }
    } catch (error) {
      // console.log(pages);
      console.log(error);
    }
  }

  jsonAppendToListService.close(outputFilename);
})();

function buildForm(offset, topic) {
  const formData = new FormData();

  const data = `a:2:{i:0;s:8:"articles";i:1;s:${topic.length}:"${topic}";}`;
  const buffer = Buffer.from(data);
  const base64data = buffer.toString('base64');

  formData.append('offset', offset);
  formData.append('event', 'sys.search#morepages');
  formData.append('where', base64data);

  return formData;
}
