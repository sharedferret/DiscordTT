const git = require('git-rev');
const pkg = require(global.paths.root + '/package.json');

const handleMessage = function(bot, message, input) {
  const embed = Utils.createEmbed(message);
  
  embed.setAuthor(bot.user.username, bot.user.avatarURL);
  embed.setThumbnail(bot.user.avatarURL);
  embed.setDescription('Tohru is a music-focused bot bringing a Turntable.fm-style experience to Discord.');

  embed.addField('Development/Support Server', 'http://discord.tohru.club/', true);
  embed.addField('Invite Link', 'http://invite.tohru.club/', true);

  // TODO: This retrieves the current git-rev. Instead, run this at bot startup and cache the value.
  git.short(function(rev) {
    if (rev) {
      embed.addField('Version', rev + ' (' + pkg.version + ')');
    } else {
      embed.addField('Version', pkg.version);
    }
    
    embed.addField('Servers', bot.guilds.size);
    embed.addField('Users', bot.users.size);

    message.channel.send('', { embed: embed });
  });
};

const info = {
  name: ['about'],
  description: 'Find out about Tohru!',
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'List all commands.'
      }
    }
  },
  type: CommandType.General
};

module.exports = {
  info: info
};
