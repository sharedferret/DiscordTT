const pkg = require(global.paths.root + '/package.json');

const handleMessage = function(bot, message, input) {
  const embed = Utils.createEmbed(message);
  
  embed.setAuthor(bot.user.username, bot.user.avatarURL);
  embed.setThumbnail(bot.user.avatarURL);
  embed.setDescription('Tohru is a Discord bot with an extensive list of commands, including server ' +
    'moderation and a music DJing feature based on Turntable.fm. Type ' +
    Utils.createCommandWithPrefix('help', message.guild ? message.guild.id : null) + ' to see the commands I support.');

  if (global.gitRev) {
    embed.addField('Version', `${pkg.version} (${global.gitRev})`, true);
  } else {
    embed.addField('Version', pkg.version, true);
  }
  
  embed.addField('Creator', 'Yui#1441', true);
  embed.addField('Invite Link', 'http://invite.tohru.club/', true);
  embed.addField('Dev/Support Server', 'http://discord.tohru.club/', true);
  embed.addField('Servers', bot.guilds.size, true);
  embed.addField('Users', bot.users.size, true);
  embed.addField('Uptime', moment.duration(process.uptime() * 1000).format('d[d] h[h] m[m] s[s]'), true);

  message.channel.send('', { embed: embed });
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
