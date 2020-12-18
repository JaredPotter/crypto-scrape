const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

const SERVICE = 'coindesk';
const FILENAME = `${SERVICE}.json`;

(async () => {
  const topic = process.argv[2];

  if (!topic) {
    console.log('Please pass a topic');
    return;
  }

  const outputFilename = `${SERVICE}_${topic}_posts.csv`;

  const postsList = JSON.parse(fs.readFileSync(topic + '_posts_' + FILENAME));

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

    const headingElement = $('h1.heading');
    const headingText = cheerio.text($(headingElement));

    if (headingText === 'Page not found.') {
      continue;
    }

    const article = $('article');

    const postDateTime = $('time', article);

    const publishDateTime = postDateTime[0].attribs.datetime;
    const updatedDateTime = postDateTime[1]
      ? postDateTime[1].attribs.datetime
      : '';

    const authorElement = $('h5[class=heading]', article);
    let author;

    if (authorElement && authorElement[0] && authorElement[0].children[0]) {
      author = authorElement[0].children[0].data;
    }

    const contentElements = $(
      'main section p, main section h2:not(.heading):not(.article-recirculation-heading), main section h3:not(.newsletter-promotion-title), .article-list li, .classic-body li, main span[class=tag] a'
    );

    let postContent = '';
    const tags = [];

    for (let i = 0; i < contentElements.length; i++) {
      const element = contentElements[i];
      const value = cheerio.text($(element));

      if (element.name === 'p') {
        postContent = postContent + value + ' ';
      } else if (element.name === 'h2') {
        if (value !== 'Who won #CryptoTwitter?') {
          postContent = postContent + value + ' ';
        }
      } else if (element.name === 'a') {
        tags.push(value);
      }
    }

    const newPost = {
      ...post,
      publishDateTime,
      updatedDateTime,
      author,
      tags,
      postContent,
    };

    delete newPost.date;

    if (!fs.existsSync(outputFilename)) {
      let headers = Object.keys(newPost).reduce((sum, key) => {
        sum += key + ',';

        return sum;
      }, '');
      headers = headers.substring(0, headers.length - 1) + '\n';

      fs.writeFileSync(outputFilename, headers);
    }

    let csvTags = newPost.tags.reduce((sum, tag) => {
      sum += tag + ';';

      return sum;
    }, '');
    csvTags = csvTags.substring(0, csvTags.length - 1);

    const csvLine = `"${removeNewLinesAndQuotes(
      newPost.title
    )}","${removeNewLinesAndQuotes(
      newPost.subtitle
    )}",${removeNewLinesAndQuotes(newPost.url)},"${removeNewLinesAndQuotes(
      newPost.mainTag
    )}",${removeNewLinesAndQuotes(
      newPost.publishDateTime
    )}',${removeNewLinesAndQuotes(
      newPost.updatedDateTime
    )},"${removeNewLinesAndQuotes(newPost.author)}","${removeNewLinesAndQuotes(
      csvTags
    )}","${removeNewLinesAndQuotes(newPost.postContent)}"\n`;

    fs.appendFileSync(outputFilename, csvLine);
  }
})();

function removeNewLinesAndQuotes(value) {
  const noNewLines = value.replace(/\n/g, ' ');
  const newValue = noNewLines.replace(/"/g, '');

  return newValue;
}
