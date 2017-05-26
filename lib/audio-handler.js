var activeVoiceChannels = [];

// TODO: Do we need to lock on server instead of voice channel?
var playFile = function(bot, voiceChannel, relativePath) {
  if (!voiceChannel) {
    console.log('No voice channel');
    return;
  }

  // open a voice connection to the calling user's channel
  // don't connect to VC if there's a file already being played in that VC
  if (activeVoiceChannels.indexOf(voiceChannel) == -1) {
    activeVoiceChannels.push(voiceChannel);

    voiceChannel.join()
      .then(function(connection) {
        console.log('Playing file ' + global.paths.audio + relativePath);

        // stream local mp3
        var dispatcher = connection.playFile(global.paths.audio + relativePath,
          { volume: 0.5 });

          dispatcher.on('end', function() {
            console.log('end invoked');
            setTimeout(function() {
              connection.disconnect();
              activeVoiceChannels.splice(activeVoiceChannels.indexOf(voiceChannel), 1);
            }, 300);
          });
      })
      .catch(function(error) {
        console.log(error);
      });
  } else {
    console.log('VC request rejected due to active playback in channel');
  }
};

module.exports = {
  playFile: playFile
};
