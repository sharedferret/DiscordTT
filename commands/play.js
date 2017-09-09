const messageHandler = require(global.paths.lib + 'message-handler');
const queueHandler = require(global.paths.lib + 'queue-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const google = require('googleapis');
const youtube = google.youtube('v3');
const uuid = require('uuid/v4');
const url = require('url');
const cacheManager = require(global.paths.lib + 'cache-manager');
const moment = require('moment');
require('moment-precise-range-plugin');

const handleMessage = function(bot, message, input) {
  const searchParameters = input.input;

  if (!searchParameters) {
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
        maxResults: 3,
        q: searchParameters
      }, callback);
    },
    (callback, err, response) => {
      callback.apply(this, [err, response]);
    },
    (error, response) => {
      if (error) {
        log.warn('An error occurred while searching YouTube', error);
        return message.reply('I couldn\'t fetch Youtube videos for your request. Please try again later.');
      }

      if (response.items[0]) {
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
            embed.setAuthor(bot.user.username, bot.user.avatarURL(256));
            embed.setTitle('Select a song to play');

            let description = '_Respond within 10 seconds with the number of the song to play._\n\n';

            for (var i in response.items) {
              const length = Utils.convertYoutubeDuration(response.items[i].contentDetails.duration);
              const restrictedCountries = response.items[i].contentDetails.regionRestriction;

              // Only add track if it's available to be played in the country the bot is running in
              if (!(config.turntable.serverCountry && restrictedCountries && restrictedCountries.blocked &&
                restrictedCountries.blocked.indexOf(config.turntable.serverCountry) !== -1)) {

                description += `${parseInt(i) + 1}) [${response.items[i].snippet.title}](https://www.youtube.com/watch?v=${response.items[i].id}) (${length.format('hh[:]mm[:]ss')})\n`;
              } else {
                log.info('cannot play ' + response.items[i].id);
              }
            }

            embed.setDescription(description);

            const id = uuid();
            messageHandler.addRequest({
              type: 'play',
              message: message,
              data: response.items,
              created: new Date(),
              handler: handleActiveRequest,
              id: id
            });

            const requestHandler = function(id) {
              log.info('Removing request ' + id);
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
      tt.playUnqueuedSong(bot, message.guild.id, message, item);

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
        log.warn('An error occurred while searching YouTube', error);
        return message.reply('I couldn\'t fetch the Youtube video for your request. Please try again later.');
      }

      if (response.items[0]) {
        tt.playUnqueuedSong(bot, message.guild.id, message, response.items[0]);
      }
    }
  );
};

const info = {
  name: ['play'],
  description: 'Plays a song in a voice channel. This command is for one-off song requests and does not use a user\'s personal queue.',
  type: CommandType.TTMusic,
  hidden: true,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '[song name]': 'Searches Youtube for the given song title, then plays the result.',
        '[Youtube Video URL]': 'Plays the given Youtube video.'
      }
    }
  }
};

module.exports = {
  info: info,
  handleActiveRequest: handleActiveRequest,
  handleMessage: handleMessage
};
