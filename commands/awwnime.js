const { URL, URLSearchParams } = require('url');
const request = require('request');
const RateLimiter = require(global.paths.lib + 'rate-limiter');
const redis = require(global.paths.lib + 'redis-client');
const cacheManager = require(global.paths.lib + 'cache-manager');

const handleMessage = function(bot, message, input) {
  if (input.flags && input.flags.l === '') {
    return listSubreddits(message);
  }

  let sources = [];

  if (input.flags && input.flags.s) {
    const userSources = input.flags.s.split(' ');

    for (const userSource of userSources) {
      if (Utils.Subreddit[userSource]) {
        sources.push(Utils.Subreddit[userSource].id);
      }
    }
  }
  
  if (sources.length == 0) {
    sources = [
      Utils.Subreddit.awwnime.id,
      Utils.Subreddit.animewallpaper.id,
      Utils.Subreddit.araragigirls.id,
      Utils.Subreddit.cutelittlefangs.id,
      Utils.Subreddit.hatsune.id,
      Utils.Subreddit.headpats.id,
      Utils.Subreddit.homura.id,
      Utils.Subreddit.honkers.id,
      Utils.Subreddit.imouto.id,
      Utils.Subreddit.k_on.id,
      Utils.Subreddit.kanmusu.id,
      Utils.Subreddit.kemonomimi.id,
      Utils.Subreddit.kitsunemimi.id,
      Utils.Subreddit.lovelive.id,
      Utils.Subreddit.megane.id,
      Utils.Subreddit.moescape.id,
      Utils.Subreddit.oddeye.id,
      Utils.Subreddit.onetrueidol.id,
      Utils.Subreddit.onodera.id,
      Utils.Subreddit.patchuu.id,
      Utils.Subreddit.theforgottenidol.id,
      Utils.Subreddit.thericegoddess.id,
      Utils.Subreddit.tsunderes.id,
      Utils.Subreddit.twgok.id,
      Utils.Subreddit.twintails.id,
      Utils.Subreddit.twodeeart.id
    ];
  }

  const searchParameters = input.input;

  const url = new URL('https://www.redditbooru.com/images/');
  if (searchParameters) url.searchParams.append('q', searchParameters);

  url.searchParams.append('sources', sources.join(','));
  url.searchParams.append('limit', '20');

  cacheManager.makeCachedApiCall(
    `Redditbooru:${url}`,
    21600, // 6 hours
    (callback) => {
      request(url.href, callback);
    },
    (callback, err, response, body) => {
      callback.apply(this, [err, body]);
    },
    (err, body) => {
      if (err) {
        log.warn(err);
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
    }
  );
};

const listSubreddits = function(message) {
  const sfwSubreddits = [];

  _.forOwn(Utils.Subreddit, function(subredditInfo, subredditName) {
    if (subredditInfo.sfw) {
      sfwSubreddits.push(subredditName);
    }
  });

  message.reply('these are the subreddits I am able to search in:\n' + sfwSubreddits.sort().join(', '));
};

const limiter = RateLimiter({
  namespace: 'UserRateLimit:awwnime:',
  interval: 180000,
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
        s: 'Search a specific subreddit (supports multiple subreddits, space delimited).',
        l: 'List supported subreddits.'
      }
    }
  },
  examples: [
    'awwnime yui -s k_on',
    'awwnime hanayo -s lovelive thericegoddess awwnime'
  ],
  type: CommandType.Image,
  hidden: false,
  rateLimiter: limiter
};

module.exports = {
  info: info
};
