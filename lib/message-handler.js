var fs = require('fs');

// Static list of commands supported by the bot
var commands = [];

// Active info requests from the bot (for multi-part commands, e.g. adding a new song)
var activeRequests = [];

var addRequest = function(request) {
  console.log('pushing new request');
  activeRequests.push(request);
};

var removeRequest = function(id) {
  console.log('removing ' + id);
  _.remove(activeRequests, function(i) { return i.id = id; });
  console.log('requests: ', activeRequests);
};

var handleActiveRequest = function(bot, message) {
  // Check if there's an active request for this user and channel
  var request = _.find(activeRequests, function(i) { return i.message.author.id === message.author.id && i.message.channel.id === message.channel.id; });

  if (request) {
    console.log('found active request for user ' + message.author.username);

    // Invoke message handler
    // request.handler.handleActiveRequest(bot, message, request);
    request.handler.apply(this, [bot, message, request]);
  }
};

var handleMessage = function(bot, message) {
  // See if there's an active request to process
  this.handleActiveRequest(bot, message);

  // Otherwise, find an appropriate command handler
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
  commands: commands,
  addRequest: addRequest,
  removeRequest: removeRequest,
  handleActiveRequest: handleActiveRequest
};
