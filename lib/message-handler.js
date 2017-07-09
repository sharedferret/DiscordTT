const fs = require('fs');

// Static list of commands supported by the bot
const commands = [];

// Active user info requests from the bot (for multi-part commands, e.g. adding a new song)
const activeRequests = [];

// Add a new user info request
const addRequest = function(request) {
  activeRequests.push(request);
};

// Remove a user info request
const removeRequest = function(id) {
  _.remove(activeRequests, function(i) { return i.id == id; });
};

// Check if an incoming message fulfills an active user info request
const handleActiveRequest = function(bot, message) {
  // Check if there's an active request for this user and channel
  const request = _.find(activeRequests, function(i) { return i.message.author.id === message.author.id && i.message.channel.id === message.channel.id; });

  if (request) {
    // Invoke message handler
    request.handler.apply(this, [bot, message, request]);
  }
};

const handleMessage = function(bot, message) {
  // See if there's an active request to process
  this.handleActiveRequest(bot, message);

  // Otherwise, find an appropriate command handler
  const handler = this.fetchCommand(message.content);

  if (handler) {
    handler.handleMessage(bot, message);
  }
};

const fetchCommand = function(content) {
  return _.find(commands, function(o) { 
    try {
      return o.matches(content); 
    } catch (e) {
      console.log('Message handling failed!', e);
      return false;
    }
  });
};

const loadCommands = function() {
  try {
    console.log('Loading commands...');
    const filenames = fs.readdirSync(global.paths.commands);

    if (commands.length == 0) {
      for (let index in filenames) {
        try {
          console.log(' -Loading ' + filenames[index]);
          const command = require(global.paths.commands + filenames[index]);
          commands.push(command);
        } catch (e) {
          console.warn('    WARN: Could not load command. ', e);
        }
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
