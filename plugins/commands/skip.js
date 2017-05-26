var name = ['/skip'];
var description = 'Skips the currently playing song.';

var tt = require(global.paths.lib + 'turntable-handler');

var handleMessage = function(bot, message) {
  // TODO: This will need to occur in a lib handler
  // TODO: This loop will act as the bot's main event loop when a DJ session is active
  // TODO: Optimize for bandwidth constraints (e.g. cache downloaded songs)

  tt.skipSong();

/**
  var vc = message.member.voiceChannel;

  vc.join()
    .then(function(connection) {
      var ytOpts = {
        quality: 'lowest',
        filter: 'audioonly',
        retries: 3
      };

      var stream = ytdl('https://www.youtube.com/watch?v=fRyaX6yN4vs', ytOpts);
      var dispatcher = connection.playStream(stream, { seek: 0, volume: 0.4 });

      dispatcher.once('end', function() {
        connection.disconnect();
      });

    })
    .catch(function(error) {
      console.log(error);
    }); */
    
};

var matches = function(input) {
  return name.indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  handleMessage: handleMessage,
  matches: matches
};
