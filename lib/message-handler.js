var fs = require('fs');

var commands = [];

var handleMessage = function(bot, message) {
  var handler = this.fetchCommand(message.content);

  if (handler) {
    handler.handleMessage(bot, message);
  }
};

var fetchCommand = function(content) {
  return _.find(commands, function(o) { 
    try {
      return o.matches(content); 
    } catch (e) {
      console.log('Message handling failed!', e);
      return false;
    }
  });
};

var loadCommands = function() {
  try {
    console.log('Loading commands...');
    var filenames = fs.readdirSync(global.paths.commands);

    for (var index in filenames) {
      try {
        console.log(' -Loading ' + filenames[index]);
        var command = require(global.paths.commands + filenames[index]);
        commands.push(command);
      } catch (e) {
        console.warn('    WARN: Could not load command. ' + e);
      }
    }

    console.log('Commands loaded!');
  } catch (err) {
    console.error('Unable to load command.', err);
  }
};

module.exports = {
  loadCommands: loadCommands,
  handleMessage: handleMessage,
  fetchCommand: fetchCommand,
  commands: commands
};
