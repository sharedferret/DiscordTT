const messageHandler = require(global.paths.lib + 'message-handler');
const queueHandler = require(global.paths.lib + 'queue-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const google = require('googleapis');
const youtube = google.youtube('v3');
const uuid = require('uuid/v4');
const url = require('url');

const handleMessage = function(bot, message, input) {
  const searchParameters = input.input;

  if (searchParameters == '') {
    return message.reply('no results found.');
  }

  // TODO: Auto-add song if a full Youtube URL was provided
  const messageUrl = url.parse(searchParameters);

  if (messageUrl.host && messageUrl.host.indexOf('youtube.com') > -1 && messageUrl.query && messageUrl.query.indexOf('v=') > -1) {
    const vStart = messageUrl.query.substring(messageUrl.query.indexOf('v='), messageUrl.query.length);
    const videoId = vStart.substring(2, vStart.indexOf('&') > 1 ? vStart.indexOf('&') : vStart.length);
    return addYoutubeVideo(bot, message, videoId);
  }

  youtube.search.list({
    key: config.api.google,
    part: 'snippet',
    type: 'video',
    maxResults: 3,
    q: searchParameters
  }, function(error, response) {
    if (error) {
      console.warn('An error occurred while searching YouTube', error);
      return message.reply('I couldn\'t fetch Youtube videos for your request. Please try again later.');
    }

    if (response.items[0]) {
      const embed = Utils.createEmbed(message);

      embed.setAuthor(bot.user.username, bot.user.avatarURL);

      embed.setTitle('Select a song to add');

      let description = '_Respond within 10 seconds with the number of the song to add to your queue._\n\n';

      for (var i in response.items) {
        description += (parseInt(i) + 1) + ') [' + response.items[i].snippet.title +'](https://www.youtube.com/watch?v=' + response.items[i].id.videoId + ')\n';
      }

      embed.setDescription(description);

      console.log('adding request');

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
        console.log('Removing request ' + id);
        messageHandler.removeRequest(id);
      };

      // Remove this handler after 10 seconds, if it hasn't already been handled
      setTimeout(requestHandler.bind(this, id), 10000);

      message.channel.send('', { embed: embed });
    } else {
      return message.reply('I was unable to find matching songs for your request.');
    }
  });
};

const handleActiveRequest = function(bot, message, request) {
  console.log('handling request from queue');

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
  youtube.videos.list({
    key: config.api.google,
    part: 'snippet,contentDetails',
    type: 'video',
    id: videoId
  }, function(error, response) {
    if (error) {
      console.warn('An error occurred while searching YouTube', error);
      return message.reply('I couldn\'t fetch the Youtube video for your request. Please try again later.');
    }

    if (response.items[0]) {
      queueHandler.queueSong(bot, message, response.items[0]);
    }
  });
};

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
  }
};

module.exports = {
  info: info,
  handleActiveRequest: handleActiveRequest,
  handleMessage: handleMessage
};
