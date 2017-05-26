require('./globals');

var util = require('util');
var fs = require('fs');

var Discord = require('discord.js');
var bot = new Discord.Client();

bot.on('ready', function(data) {
	/**
	bot.user.setUsername('Ruby-chan')
		.then(function(user) {
			console.log('changed successfully');
		}); */

	var avatar = fs.readFileSync(global.paths.assets + 'ruby-2.jpg');

	bot.user.setAvatar(avatar)
		.then(function(user) {
			console.log(user);
			console.log('changed');
		})
		.catch(function(e) {
			console.error(e);
		});
});

try {
  bot.login(config.discord.credentials.token);
} catch (e) {
  console.log('login failed', e);
}
