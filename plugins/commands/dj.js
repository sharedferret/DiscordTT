var name = ['/dj'];
var description = 'Adds you to the queue to DJ.';
var usage = '`/dj`: Adds you to the DJ queue. If there is room on the table, you will step up and begin playing music.';

var handleMessage = function(bot, message) {
  message.reply('this command has not been implemented.');
};

var matches = function(input) {
  return name.indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  handleMessage: handleMessage,
  matches: matches
};
