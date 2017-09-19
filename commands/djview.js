const tt = require(global.paths.lib + 'turntable-handler');
const db = require(global.paths.lib + 'database-client').db;

const handleMessage = function(bot, message, input) {
  if (!message.guild) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  const embed = Utils.createEmbed(message);

  embed.setAuthor('Current DJs', bot.user.avatarURL);
  const state = tt.getState(message.guild.id);

  if (state) {
    tt.getVotesForSong(bot, message.guild.id)
      .then(votes => {
        db.all('SELECT id, points FROM User WHERE id IN (' + state.djs.map(function(i) { return i.id; }).join(',') + ')', [],
          function(err, result) {
            if (err) log.info(err);

            let description = '';

            for (var i in state.djs) {
              const djName = (state.currentDj == i ? ':cd:\t' : '\t') + state.djs[i].username;
              const djPoints = _.find(result, j => { return j.id == state.djs[i].id; }).points;
              description += `**${djName}** (${djPoints} points)\n`;
            }

            embed.setDescription(description);

            if (state.nowPlaying) {
              embed.addField('Now Playing', state.nowPlaying.title + '\n' + votes.up + ':thumbsup:  '+ votes.down + ':thumbsdown:');
            }
    
            embed.addField('Waiting DJs', '_None_');

            message.channel.send('', { embed: embed });
          });
      });
  } else {
    message.reply('there are no users DJing at the moment.');
  }
};

const info = {
  name: ['djs', 'view'],
  description: 'View DJs',
  type: CommandType.TTMusic,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'View active DJs.'
      }
    }
  }
};

module.exports = {
  info: info
};
