var fs = require('fs');

var name = '/opinion';

var handleMessage = function(bot, message) {
  message.channel.sendFile(global.paths.assets + 'images/opinion.jpg', 'opinion.jpg');
};

var matches = function(input) {
  return input.trim() === name;
};

module.exports = {
  name: name,
  handleMessage: handleMessage,
  matches: matches
};
