var name = ['about'];
var description = 'Find out about Tohru!';
var usage = '`' + config.discriminator + 'about`: List all commands.';

var Discord = require('discord.js');
var git = require('git-rev');
var pkg = require(global.paths.root + '/package.json');

var handleMessage = function(bot, message) {
  var embed = new Discord.RichEmbed();
  embed.setAuthor(bot.user.username, bot.user.avatarURL);
  embed.setThumbnail(bot.user.avatarURL);
  embed.setDescription('Tohru is a music-focused bot bringing a Turntable.fm-style experience to Discord.');

  embed.addField('Development/Support Server', 'http://discord.tohru.club/', true);
  embed.addField('Invite Link', 'http://invite.tohru.club/', true);

  embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
  embed.setTimestamp(new Date());

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

var matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  handleMessage: handleMessage,
  matches: matches
};
