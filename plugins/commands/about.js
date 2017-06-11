const info = {
  name: ['about'],
  description: 'Find out about Tohru!',
  usage: '`' + config.discriminator + 'about`: List all commands.',
  type: CommandType.General
};

const name = ['about'];
const description = 'Find out about Tohru!';
const usage = '`' + config.discriminator + 'about`: List all commands.';
const type = CommandType.General;

const Discord = require('discord.js');
const git = require('git-rev');
const pkg = require(global.paths.root + '/package.json');

const handleMessage = function(bot, message) {
  const embed = new Discord.RichEmbed();
  embed.setAuthor(bot.user.username, bot.user.avatarURL);
  embed.setThumbnail(bot.user.avatarURL);
  embed.setDescription('Tohru is a music-focused bot bringing a Turntable.fm-style experience to Discord.');

  embed.addField('Development/Support Server', 'http://discord.tohru.club/', true);
  embed.addField('Invite Link', 'http://invite.tohru.club/', true);

  embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
  embed.setTimestamp(new Date());

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

// TODO: This fn is used by most handlers, pull into common fn
const matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  type: type,
  handleMessage: handleMessage,
  matches: matches
};
