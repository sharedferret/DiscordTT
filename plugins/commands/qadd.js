const info = {
  name: ['q+ ', 'q add '],
  description: 'Adds a song to your playlist.',
  usage: '`' + config.discriminator + 'q+ [song name or YouTube ID]`\n`' + config.discriminator + 'q add [song name or YouTube ID]`',
  type: CommandType.TTPlaylist
};

const messageHandler = require(global.paths.lib + 'message-handler');
const queueHandler = require(global.paths.lib + 'queue-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const google = require('googleapis');
const youtube = google.youtube('v3');
const Discord = require('discord.js');
const uuid = require('uuid/v4');

const handleMessage = function(bot, message) {
  let searchParameters = '';

  if (message.content.startsWith(config.discriminator + 'q+')) {
    searchParameters = message.content.substring(config.discriminator.length + 3, message.content.length);
  } else {
    searchParameters = message.content.substring(config.discriminator.length + 6, message.content.length);
  }

  if (searchParameters == '') {
    return message.reply('no results found.');
  }

  // TODO: Auto-add song if a full Youtube URL was provided

  youtube.search.list({
    key: config.api.google,
    part: 'snippet',
    type: 'video',
    maxResults: 3,
    q: searchParameters
  }, function(error, response) {
    if (error) {
      console.warn('An error occurred while searching YouTube', error);
      return message.reply('I was unable to find matching songs for your request.');
    }

    if (response.items[0]) {
      const embed = new Discord.RichEmbed();

      embed.setAuthor(bot.user.username, bot.user.avatarURL);
      embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
      embed.setTimestamp(new Date());

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
    }
  });
};

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'q add') || 
    _.startsWith(input, config.discriminator + 'q+');
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

module.exports = {
  info: info,
  handleMessage: handleMessage,
  handleActiveRequest: handleActiveRequest,
  matches: matches
};
