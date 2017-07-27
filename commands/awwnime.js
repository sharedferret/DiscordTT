const { URL, URLSearchParams } = require('url');
const request = require('request');
const RateLimiter = require(global.paths.lib + 'rate-limiter');
const redis = require(global.paths.lib + 'redis-client');

const handleMessage = function(bot, message, input) {
  const searchParameters = input.input;

  const url = new URL('https://www.redditbooru.com/images/');
  if (searchParameters) url.searchParams.append('q', searchParameters);
  url.searchParams.append('sources', '1,44,50,61,38,28,43,21,47,13,41,26,20,7,46,48,15,62,33,30,17,55,35,19,32,34,23');
  url.searchParams.append('limit', '20');
  console.log(url.href);

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

const limiter = RateLimiter({
  namespace: 'UserRateLimit:awwnime:',
  interval: 300000,
  maxInInterval: 5,
  minDifference: 3000,
  storeBlocked: false
});

const info = {
  name: ['awwnime'],
  description: 'Redditbooru image search.',
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        ''             : 'Returns a random recent image from the awwnime subreddits.',
        '[search term]': 'Returns an image for the given search term.'
      },
      flags: {
        s: 'Search a specific subreddit.',
        l: 'List supported subreddits.'
      }
    }
  },
  examples: [
    'awwnime yui -s k_on'
  ],
  type: CommandType.Image,
  hidden: false,
  rateLimiter: limiter
};

module.exports = {
  info: info
};
