const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'https://www.coindesk.com/wp-json/v1/search';
const FILENAME = 'coindesk.json';

(async () => {
  const topic = process.argv[2];

  if (!topic) {
    console.log('Please pass a topic');
    return;
  }

  const firstPageUrl = `${BASE_URL}?keyword=${topic}`;
  const firstPage = await axios.get(firstPageUrl);

  const posts = [];

  for (const rawPost of firstPage.data.results) {
    const post = {
      title: rawPost.title,
      subtitle: rawPost.text,
      url: rawPost.url,
      date: rawPost.date,
      mainTag: rawPost.tag.name,
    };

    posts.push(post);
  }

  // fs.writeFileSync('POSTS_' + FILENAME, JSON.stringify(posts));

  const resultCount = firstPage.data.total;

  const pageCount = Math.ceil(resultCount / 10);

  console.log(pageCount);

  for (let pageNumber = 2; pageNumber <= pageCount; pageNumber++) {
    console.log(`fetching page ${pageNumber} of posts for ${topic}`);
    const pageUrl = `${firstPageUrl}&page=${pageNumber}`;
    const page = await axios.get(pageUrl);

    for (const rawPost of page.data.results) {
      const post = {
        title: rawPost.title,
        subtitle: rawPost.text,
        url: rawPost.url,
        date: rawPost.date,
        mainTag: rawPost.tag.name,
      };

      posts.push(post);
    }

    fs.writeFileSync(topic + '_posts_' + FILENAME, JSON.stringify(posts));
  }
  // }
})();
