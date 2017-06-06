var name = ['/q+ ', '/q add '];
var description = 'Adds a song to your playlist.';
var usage = '`/q+ [song name or YouTube ID]`\n`/q add [song name or YouTube ID]`';

var messageHandler = require(global.paths.lib + 'message-handler');
var queueHandler = require(global.paths.lib + 'queue-handler');
var tt = require(global.paths.lib + 'turntable-handler');
var google = require('googleapis');
var youtube = google.youtube('v3');
var Discord = require('discord.js');
var uuid = require('uuid/v4');

var handleMessage = function(bot, message) {
  var searchParameters = message.content.substring(message.content.startsWith('/q+') ? 4 : 7, message.content.length);

  if (searchParameters == '') {
    return message.reply('no results found.');
  }

  youtube.search.list({
    key: config.api.youtube,
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
      var embed = new Discord.RichEmbed();

      embed.setAuthor(bot.user.username, bot.user.avatarURL);
      embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
      embed.setTimestamp(new Date());

      embed.setTitle('Select a song to add');

      var description = '_Respond within 10 seconds with the number of the song to add to your queue._\n\n';

      for (var i in response.items) {
        description += (parseInt(i) + 1) + ') [' + response.items[i].snippet.title +'](https://www.youtube.com/watch?v=' + response.items[i].id.videoId + ')\n';
      }

      embed.setDescription(description);

      console.log('adding request');

      var id = uuid();

      messageHandler.addRequest({
        type: 'queue',
        message: message,
        data: response.items,
        created: new Date(),
        handler: handleActiveRequest,
        id: id
      });

      var requestHandler = function(id) {
        console.log('Removing request ' + id);
        messageHandler.removeRequest(id);
      };

      // Remove this handler after 10 seconds, if it hasn't already been handled
      setTimeout(requestHandler.bind(this, id), 10000);

      message.channel.send('', { embed: embed });
    }
  });
};

var matches = function(input) {
  return _.startsWith(input, '/q add') || _.startsWith(input, '/q+');
};

var handleActiveRequest = function(bot, message, request) {
  console.log('handling request from queue');

  var content = message.content.trim();

  if (message.content >= 1 && message.content <= 3) {
    // Get YT ID for this result
    var item = request.data[parseInt(message.content) - 1];
    if (item) {
      queueHandler.queueSong(bot, message, item);

      // Remove this request from the active queue
      messageHandler.removeRequest(request.id);
    }
  }
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  handleMessage: handleMessage,
  handleActiveRequest: handleActiveRequest,
  matches: matches
};
