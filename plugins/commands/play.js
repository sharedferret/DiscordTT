var name = ['/play '];
var description = 'Plays a song.';
var usage = '`/play [YouTube ID]`: Plays a song with the given YouTube ID (the string after `https://youtube.com/watch?v=`). The bot will play the song in the voice channel you\'re connected to.';

var tt = require(global.paths.lib + 'turntable-handler');

var handleMessage = function(bot, message) {
  // TODO: This will need to occur in a lib handler
  // TODO: This loop will act as the bot's main event loop when a DJ session is active
  // TODO: Optimize for bandwidth constraints (e.g. cache downloaded songs)

  if (message.content.length < 6) {
    return message.reply('please provide a YouTube video ID.');
  }

  var songid = message.content.substring(6, message.content.length);

  tt.playSong(bot, message.member.voiceChannel, 'https://www.youtube.com/watch?v=' + songid);
};

var matches = function(input) {
  return _.startsWith(input, '/play ') || input == '/play';
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  handleMessage: handleMessage,
  matches: matches
};
