const request = require('request');
const xml2js = require('xml2js');
const htmltotext = require('html-to-text');
const RateLimiter = require(global.paths.lib + 'rate-limiter');
const cacheManager = require(global.paths.lib + 'cache-manager');

const handleMessage = function(bot, message, input) {
  if (!input.input) {
    return message.reply('please provide an anime title to search for.');
  }

  if (input.flags && input.flags.kitsu !== undefined) {
    searchWithKitsu(bot, message, input);
  } else if (input.flags && input.flags.mal !== undefined) {
    searchWithMal(bot, message, input);
  } else {
    searchWithKitsu(bot, message, input);
    // searchWithMal(bot, message, input);
  }
};

const searchWithKitsu = function(bot, message, input) {
  const searchString = input.input;

  cacheManager.makeCachedApiCall(
    `Kitsu:${encodeURIComponent(searchString)}`,
    604800, // 7 days
    (callback) => {
      request('https://kitsu.io/api/edge/anime?filter%5btext%5d=' + encodeURIComponent(searchString) + '&page%5blimit%5d=1',
      callback);
    },
    (callback, err, response, body) => {
      callback.apply(this, [err, body]);
    },
    (err, body) => {
      try {
        const parsedBody = JSON.parse(body);

        if (parsedBody.data && parsedBody.data[0]) {
          respondWithKitsuOutput(message, parsedBody.data[0]);
        } else {
          message.reply('I couldn\'t find that anime.');
        }
      } catch (e) {
        log.warn('anime lookup failure (Kitsu)', e);
        message.reply('I couldn\'t find that anime.');
      }
    }
  );
};

const respondWithKitsuOutput = function(message, result) {
  // Grab streaming links
  cacheManager.makeCachedApiCall(
    `Kitsu:Streaming_` + result.id,
    604800,
    (callback) => {
      request('https://kitsu.io/api/edge/anime/' + result.id + '/streaming-links', callback);
    },
    (callback, err, response, body) => {
      callback.apply(this, [err, body]);
    },
    (slErr, slBody) => {
      const parsedSlBody = JSON.parse(slBody);
      const streamingLinkData = parsedSlBody.data;

      const streamingLinks = [];

      for (const streamingLink of streamingLinkData) {
        streamingLinks.push(streamingLink.attributes.url);
      }

      const embed = Utils.createEmbed(message, 'Kitsu.io');

      embed.setTitle(result.attributes.canonicalTitle);
      embed.setDescription(result.attributes.synopsis);

      embed.addField('Type', result.attributes.subtype, true);
      embed.addField('Episodes', result.attributes.episodeCount, true);
      embed.addField('Status', result.attributes.status, true);
      embed.addField('Rating', result.attributes.averageRating, true);
      embed.addField('Popularity', result.attributes.popularityRank, true);
      embed.addField('Aired', result.attributes.startDate + ' to ' + result.attributes.endDate, true);
      embed.addField('Link', 'https://kitsu.io/anime/' + result.attributes.slug);

      if (streamingLinks.length > 0) {
        embed.addField('Streaming Links', streamingLinks.join('\n'));
      }
      
      const altTitles = [];
      if (result.attributes.titles.en) altTitles.push('_Romanized_: ' + result.attributes.titles.en);
      if (result.attributes.titles.ja_jp) altTitles.push('_Japanese_: ' + result.attributes.titles.ja_jp); 
      embed.addField('Alternate Titles', altTitles.join('\n'));

      embed.setThumbnail(result.attributes.posterImage.small);

      message.channel.send('', { embed: embed });
    }
  );
};

const searchWithMal = function(bot, message, input) {
  const searchString = input.input;

  cacheManager.makeCachedApiCall(
    `MAL:JSONSearch_${encodeURIComponent(searchString)}`,
    604800,
    (callback) => {
      request('https://myanimelist.net/search/prefix.json?type=anime&keyword=' + encodeURIComponent(searchString), callback);
    },
    (callback, err, response, body) => {
      callback.apply(this, [err, body]);
    },
    (err, body) => {
      try {
        const parsedBody = JSON.parse(body);

        if (parsedBody.categories && parsedBody.categories[0] && parsedBody.categories[0].items[0]) {
          log.info('MAL Prefix Search matched: ' + parsedBody.categories[0].items[0].name);
          respondWithMalOutput(message, parsedBody.categories[0].items[0], searchString);
        } else {
          message.reply('I couldn\'t find that anime.');
        }
      } catch (e) {
        log.warn('anime lookup failure (MAL)', e);
        message.reply('I couldn\'t find that anime.');
      }
    }
  );
};

const respondWithMalOutput = function(message, result, searchString) {
  // Somehow the XML search uses a different algorithm that doesn't actually work, so use the response from
  // the JSON search above
  cacheManager.makeCachedApiCall(
    `MAL:XMLSearch_${result.name}`,
    604800,
    (callback) => {
      request('https://' + config.api.myanimelist.username + ':' + config.api.myanimelist.password + 
        '@myanimelist.net/api/anime/search.xml?q=' + encodeURIComponent(result.name), callback);
    },
    (callback, err, response, body) => {
      callback.apply(this, [err, body]);
    },
    (err, body) => {
      try {
        // I despise XML.
        xml2js.parseString(body, function(err, xml) {
          const entry = xml.anime.entry[0];

          log.info('MAL XML Search matched: ' + entry.title[0]);

          const embed = Utils.createEmbed(message, 'MyAnimeList.net');

          embed.setTitle(entry.title[0]);
          embed.setDescription(htmltotext.fromString(entry.synopsis[0], { wordwrap: false }));

          embed.addField('Type', entry.type[0], true);
          embed.addField('Episodes', entry.episodes[0], true);
          embed.addField('Status', entry.status[0], true);
          embed.addField('Rating', entry.score[0], true);
          // embed.addField('Popularity', result.attributes.popularityRank, true);
          embed.addField('Aired', result.payload.aired, true);
          embed.addField('Link', decodeURIComponent(result.url));
          
          // const altTitles = [];
          // if (result.attributes.titles.en) altTitles.push('_Romanized_: ' + result.attributes.titles.en);
          // if (result.attributes.titles.ja_jp) altTitles.push('_Japanese_: ' + result.attributes.titles.ja_jp); 
          // if (altTitles.length > 0) embed.addField('Alternate Titles', altTitles.join('\n'));

          embed.setThumbnail(entry.image[0]);

          message.channel.send('', { embed: embed });
        });
      } catch (e) {
        log.warn('anime lookup failure (MAL)', e);
      }
    }
  );
};

const limiter = RateLimiter({
  namespace: 'UserRateLimit:anime:',
  interval: 180000,
  maxInInterval: 5,
  minDifference: 3000,
  storeBlocked: false
});

const info = {
  name: ['anime'],
  description: 'Searches MyAnimeList for anime information.',
  type: CommandType.General,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '[search string]': 'Search for and display information about an anime.'
      },
      flags: {
        kitsu: 'Search using kitsu.io',
        mal: 'Search using MyAnimeList.net'
      }
    }
  },
  rateLimiter: limiter
};

module.exports = {
  info: info
};
