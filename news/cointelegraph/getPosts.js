const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

const SERVICE = 'cointelegraph';

(async () => {
  const topic = process.argv[2];

  if (!topic) {
    console.log('Please pass a topic');
    return;
  }

  const outputFilename = `${SERVICE}_${topic}_posts.csv`;

  const postsList = JSON.parse(
    fs.readFileSync(`${SERVICE}_${topic}_post_list.json`)
  );

  for (const post of postsList) {
    console.log(`Fetching ${post.url}`);
    let response;

    try {
      response = await axios.get(post.url);
    } catch (error) {
      console.log(error);
      continue;
    }

    const postHtml = response.data;

    const $ = cheerio.load(postHtml);

    const article = $('article');

    // TODO: Add ability to fetch "explained" category articles
    // https://cointelegraph.com/explained/crypto-cross-border-payments-explained

    const contentWrapper = $('div.post__content-wrapper', article);
    const contentElements = $('p, blockquote', contentWrapper);
    const tagElements = $('a[class=tags-list__link]', contentWrapper);

    let postContent = '';
    let tags = '';

    for (let i = 0; i < contentElements.length; i++) {
      const element = contentElements[i];
      const value = cheerio.text($(element));

      postContent = postContent + value + ' ';
    }

    for (let i = 0; i < tagElements.length; i++) {
      const element = tagElements[i];
      const value = cheerio.text($(element));
      const tag = value.substring(2, value.length - 1);
      tags = tags + tag + ';';
    }

    tags = tags.substring(0, tags.length - 1);

    const newPost = {
      ...post,
      tags,
      postContent,
    };

    if (!fs.existsSync(outputFilename)) {
      let headers = Object.keys(newPost).reduce((sum, key) => {
        sum += key + ',';

        return sum;
      }, '');
      headers = headers.substring(0, headers.length - 1) + '\n';

      fs.writeFileSync(outputFilename, headers);
    }

    const csvLine = `"${removeNewLinesAndQuotes(
      newPost.title
    )}","${removeNewLinesAndQuotes(
      newPost.subtitle
    )}","${removeNewLinesAndQuotes(newPost.url)}","${removeNewLinesAndQuotes(
      newPost.publishedDateTime
    )}","${removeNewLinesAndQuotes(newPost.author)}","${removeNewLinesAndQuotes(
      newPost.category
    )}","${removeNewLinesAndQuotes(newPost.tags)}","${removeNewLinesAndQuotes(
      newPost.postContent
    )}"\n`;

    fs.appendFileSync(outputFilename, csvLine);
  }
})();

function removeNewLinesAndQuotes(value) {
  const noNewLines = value.replace(/\n/g, ' ');
  const newValue = noNewLines.replace(/"/g, '');

  return newValue;
}
