const axios = require('axios');
const fs = require('fs-extra');

const jsonAppendToListService = require('../json-append-to-list-service');

const SERVICE = 'cointelegraph';
const BASE_URL = 'https://cointelegraph.com/api/v1/content/search/result';

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

  let pageNumber = 1;

  while (true) {
    try {
      console.log(`fetching page ${pageNumber} of posts for ${topic}`);

      const response = await axios.post(BASE_URL, {
        page: pageNumber,
        query: topic,
      });

      const postResults = response.data.posts;

      for (const postResult of postResults) {
        if (postResult === null) {
          // skip.
          continue;
        }

        const post = {
          title: postResult.title,
          subtitle: postResult.lead,
          url: postResult.url,
          publishedDateTime: postResult.published.date,
          author: postResult.author_title,
          category: postResult.category_title,
        };

        jsonAppendToListService.append(outputFilename, post, isFirstPost);

        isFirstPost = false;
      }

      pageNumber++;
    } catch (error) {
      console.log(error);
      break;
    }
  }

  jsonAppendToListService.close(outputFilename);
})();
