const messageHandler = require(global.paths.lib + 'message-handler');
const queueHandler = require(global.paths.lib + 'queue-handler');
const google = require('googleapis');
const youtube = google.youtube('v3');
const uuid = require('uuid/v4');
const url = require('url');
const RateLimiter = require(global.paths.lib + 'rate-limiter');
const cacheManager = require(global.paths.lib + 'cache-manager');
const moment = require('moment');
require('moment-precise-range-plugin');

const handleMessage = function(bot, message, input) {
  const searchParameters = input.input;

  if (searchParameters == '') {
    return message.reply('no results found.');
  }

  const messageUrl = url.parse(searchParameters);

  if (messageUrl.host && messageUrl.host.indexOf('youtube.com') > -1 && messageUrl.query && messageUrl.query.indexOf('v=') > -1) {
    const vStart = messageUrl.query.substring(messageUrl.query.indexOf('v='), messageUrl.query.length);
    const videoId = vStart.substring(2, vStart.indexOf('&') > 1 ? vStart.indexOf('&') : vStart.length);
    return addYoutubeVideo(bot, message, videoId);
  }

  cacheManager.makeCachedApiCall(
    `Youtube:Search:${searchParameters}`,
    259200, // 3 days
    (callback) => {
      youtube.search.list({
        key: config.api.google,
        part: 'snippet',
        type: 'video',
        maxResults: 5,
        q: searchParameters
      }, callback);
    },
    (callback, err, response) => {
      callback.apply(this, [err, response]);
    },
    (error, response) => {
      if (error) {
        console.warn('An error occurred while searching YouTube', error);
        return message.reply('I couldn\'t fetch Youtube videos for your request. Please try again later.');
      }

      if (response.items[0]) {
        // Call back to Google API to grab contentDetails

        const videoIds = response.items.map(i => { return i.id.videoId; });

        cacheManager.makeCachedApiCall(
          `Youtube:Video:${videoIds.join(',')}`,
          259200, // 3 days
          (callback) => {
            youtube.videos.list({
              key: config.api.google,
              part: 'snippet,contentDetails',
              type: 'video',
              id: videoIds.join(',')
            }, callback);
          },
          (callback, err, response) => {
            callback.apply(this, [err, response]);
          },
          (error, response) => {
            const embed = Utils.createEmbed(message);
            embed.setAuthor(bot.user.username, bot.user.avatarURL);
            embed.setTitle('Select a song to add');

            let description = '_Respond within 10 seconds with the number of the song to add to your queue._\n\n';

            for (var i in response.items) {
              const length = Utils.convertYoutubeDuration(response.items[i].contentDetails.duration);
              const restrictedCountries = response.items[i].contentDetails.regionRestriction;

              // Only add track if it's available to be played in the country the bot is running in
              if (!(config.turntable.serverCountry && restrictedCountries && restrictedCountries.blocked &&
                restrictedCountries.blocked.indexOf(config.turntable.serverCountry) !== -1)) {

                description += `${parseInt(i) + 1}) [${response.items[i].snippet.title}](https://www.youtube.com/watch?v=${response.items[i].id}) (${length.format('hh[:]mm[:]ss')})\n`;
              } else {
                console.log('cannot play ' + response.items[i].id);
              }
            }

            embed.setDescription(description);

            const id = uuid();
            messageHandler.addRequest({
              type: 'queue',
              message: message,
              data: response.items,
              created: new Date(),
              handler: handleActiveRequest,
              id: id
            });

            const requestHandler = function(id) {
              messageHandler.removeRequest(id);
            };

            // Remove this handler after 10 seconds, if it hasn't already been handled
            setTimeout(requestHandler.bind(this, id), 10000);

            message.channel.send('', { embed: embed });
          }
        )
      } else {
        return message.reply('I was unable to find matching songs for your request.');
      }
    }
  );
};

const handleActiveRequest = function(bot, message, request) {
  const content = message.content.trim();

  if (message.content >= 1 && message.content <= 3) {
    // Get YT ID for this result
    const item = request.data[parseInt(message.content) - 1];
    if (item) {
      queueHandler.queueSong(bot, message, item);

      // Remove this request from the active queue
      messageHandler.removeRequest(request.id);
    }
  }
};

const addYoutubeVideo = function(bot, message, videoId) {
  cacheManager.makeCachedApiCall(
    `Youtube:Video:${videoId}`,
    1209600, // 14 days
    (callback) => {
      youtube.videos.list({
        key: config.api.google,
        part: 'snippet,contentDetails',
        type: 'video',
        id: videoId
      }, callback);
    },
    (callback, err, response) => {
      callback.apply(this, [err, response]);
    },
    (error, response) => {
      if (error) {
        console.warn('An error occurred while searching YouTube', error);
        return message.reply('I couldn\'t fetch the Youtube video for your request. Please try again later.');
      }

      if (response.items[0]) {
        queueHandler.queueSong(bot, message, response.items[0]);
      }
    }
  );
};

const limiter = RateLimiter({
  namespace: 'UserRateLimit:qadd:',
  interval: 180000,
  maxInInterval: 20,
  minDifference: 2500,
  storeBlocked: false
});

const info = {
  name: ['q+'],
  description: 'Adds a song to your current playlist\'s queue.',
  type: CommandType.TTPlaylist,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '[song name]': 'Searches Youtube for the given song title, then adds the result to your queue.',
        '[Youtube Video URL]': 'Adds the given Youtube video to your queue.'
      }
    }
  },
  rateLimiter: limiter
};

module.exports = {
  info: info,
  handleActiveRequest: handleActiveRequest,
  handleMessage: handleMessage
};
