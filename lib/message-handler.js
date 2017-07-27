'use strict';

const fs = require('fs');
const db = require(global.paths.lib + 'database-client').db;
const moment = require('moment');
const userHandler = require(global.paths.lib + 'user-handler');

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
  _.remove(activeRequests, function(i) { return i.id === id; });
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

const writeCommandMetric = function(commandName, guildId) {
  db.run('INSERT OR REPLACE INTO CommandUsage (commandName, guildId, date, count) VALUES (?, ?, ?, ' +
    '(select count FROM CommandUsage where commandName = ? and guildId = ? and date = ?) + 1)',
    [
      commandName,
      guildId,
      moment().utc().startOf('day').toDate(),
      commandName,
      guildId,
      moment().utc().startOf('day').toDate()
    ]);
};

const handleMessage = function(bot, message) {
  // See if there's an active request to process
  this.handleActiveRequest(bot, message);

  // Otherwise, find an appropriate command handler
  const cmd = this.fetchCommand(message.content);

  if (cmd) {
    cmd.handler(bot, message, cmd);

    // cmd.handleMessage(bot, message);

    // Add a botCommand point (bots can't earn points)
    if (!message.author.bot) {
      userHandler.addPoints(message.author.id, { botCommand: 1 });
    }

    // Increment command usage metric in db
    // writeCommandMetric(handler.info.name[0], message.guild ? message.guild.id : 'DM');
    writeCommandMetric(cmd.command.info.name[0], message.guild ? message.guild.id : 'DM');
  }
};

const fetchCommand = function(content) {
  try {
    if (content.indexOf(config.discriminator) === 0) {
      return parseCommand(content.substring(config.discriminator.length, content.length));
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadCommands = function() {
  try {
    console.log('Loading commands...');
    const filenames = fs.readdirSync(global.paths.commands);

    if (commands.length === 0) {
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

const parseCommand = function(input) {
  // An object containing the parsed input/options for this request, to be passed to the cmd handler.
  const cmd = {};

  // First, get a reference to the appropriate command
  cmd.name = input.split(' ', 1)[0];
  cmd.command = _.find(commands, function(o) {
    try {
      return o.info.name.indexOf(cmd.name) !== -1;
    } catch (e) {
      console.warn('Message handling failed', e);
      return false;
    }
  });

  // Return if we didn't find a command
  if (!cmd.command) return null;

  // Check if the user's input contained extra data beyond the command name
  if (input.length > cmd.name.length) {
    // Check if this request contains an operation
    let commandInput = input.substring(cmd.name.length + 1, input.length);
    const operations = cmd.command.info.operations;
    
    const operation = _.keys(operations).filter(function (i) { return commandInput.indexOf(i) > -1; })[0];
    if (operation) {
      cmd.operation = operation;
      cmd.handler = operations[operation].handler;

      // Remove operation from input
      commandInput = commandInput.substring(operation.length, commandInput.length);
      if (commandInput.indexOf(' ') == 0) commandInput = commandInput.substring(1, commandInput.length);
    } else {
      cmd.operation = '_default';
      cmd.handler = operations._default.handler;
    }

    // Parse any flags from right
    // Command flags are greedy - their input is the remaining text to the right of each flag
    // e.g. "-s first entry -t second": the -s flag will contain "first entry" and the -t flag will contain "second"
    const splitInput = commandInput.split(' ');
    const flags = cmd.command.info.operations[cmd.operation].flags;

    for (let i = splitInput.length - 1; i >= 0; i--) {
      let part = splitInput[i];

      if (part.indexOf('-') === 0 && flags[part.substring(1, part.length)]) {
        if (!cmd.flags) cmd.flags = {};
        cmd.flags[part.substring(1, part.length)] = splitInput.splice(i).splice(1).join(' ');
      }
    }

    cmd.input = splitInput.join(' ');
  } else {
    cmd.operation = '_default';
    cmd.handler = cmd.command.info.operations._default.handler;
  }
  
  return cmd;
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
