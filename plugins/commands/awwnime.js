const info = {
  name: ['awwnime'],
  description: 'Redditbooru image search. Returns a random recent image for the given search term.',
  usage: '`' + config.discriminator + 'awwnime`: Returns a random recent image from the awwnime subreddits.' +
    '\n`' + config.discriminator + 'awwnime [search term]`: Returns a random recent image for the given search term.' +
    '\n`' + config.discriminator + 'awwnime [search term] -s [subreddit name]`: Search a specific subreddit.' +
    '\n`' + config.discriminator + 'awwnime -l`: List supported subreddits.',
  type: CommandType.Image,
  hidden: false
};

const { URL, URLSearchParams } = require('url');
const request = require('request');

const handleMessage = function(bot, message) {
  const searchParameters = message.content.substring(config.discriminator.length + 8, message.content.length);

  const url = new URL('https://www.redditbooru.com/images/');
  if (searchParameters) url.searchParams.append('q', searchParameters);
  url.searchParams.append('sources', '1,44,50,61,38,28,43,21,47,13,41,26,20,7,46,48,15,62,33,30,17,55,35,19,32,34,23');
  url.searchParams.append('limit', '20');

  request(url.href, function(err, response, body) {
    if (err) {
      console.warn(err);
      return message.reply('there was an error processing your request.');
    }
    try {
      const jsonBody = JSON.parse(body);
      const entries = jsonBody.filter(function(i) { return i.nsfw == false; });
      const entry = _.sample(entries);

      let msg = decodeURIComponent(entry.cdnUrl) + '\n**' + decodeURIComponent(entry.title) + '**';
      if (entry.caption) msg += '\n_' + decodeURIComponent(entry.caption) + '_';

      message.reply(msg);
    } catch (e) {
      return message.reply('I couldn\'t find any images that matched your request.');
    }
  });
};

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'awwnime');
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
