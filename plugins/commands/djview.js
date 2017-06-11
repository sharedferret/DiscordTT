var name = ['djs', 'view'];
var description = 'View DJs';
var type = CommandType.TTMusic;

var tt = require(global.paths.lib + 'turntable-handler');
var Discord = require('discord.js');
var db = require(global.paths.lib + 'database-handler').db;

var handleMessage = function(bot, message) {
  var embed = new Discord.RichEmbed();

  embed.setAuthor('Current DJs', bot.user.avatarURL);
  embed.setTimestamp(new Date());

  tt.getVotesForSong(bot, message.guild.id);
  var state = tt.getState(message.guild.id);

  if (state) {
    db.serialize(function() {
      //TODO: Fix
      console.log('IDs', state.djs.map(function(i) { return i.id; }).join(','));
      db.all('SELECT id, points FROM User WHERE id IN (' + state.djs.map(function(i) { return i.id; }).join(',') + ')', [],
        function(err, result) {
          if (err) console.log(err);

          for (var i in state.djs) {
            var djName = (state.currentDj == i ? ':cd: ' : '') + state.djs[i].username;
            console.log('finding ' + state.djs[i].id);
            embed.addField(djName, _.find(result, function(j) { console.log('checking if ' + j.id + ' is equal to ' + state.djs[i].id); return j.id == state.djs[i].id; }).points + ' points', true);
          }

          if (state.nowPlaying) {
            embed.addField('Now Playing', state.nowPlaying.title + '\n' + state.upvotes + ':thumbsup:  '+ state.downvotes + ':thumbsdown:');
          }
  
          embed.addField('Waiting DJs', '_None_');

          message.channel.send('', { embed: embed });
        });
    });
  } else {
    message.reply('there are no users DJing at the moment.');
  }
};

var matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  type: type,
  handleMessage: handleMessage,
  matches: matches
};
