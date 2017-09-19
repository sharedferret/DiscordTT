'use strict';

const fs = require('fs');
const db = require(global.paths.lib + 'database-client').db;
const moment = require('moment');
require('moment-duration-format');
const userHandler = require(global.paths.lib + 'user-handler');
const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const imageHandler = require(global.paths.lib + 'image-handler');
const Discord = require('discord.js');

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

const runCommand = function(bot, message, cmd) {
  cmd.handler(bot, message, cmd);

  // Add a botCommand point (bots can't earn points)
  if (!message.author.bot) {
    userHandler.addPoints(message.author.id, { botCommand: 1 });
  }

  // Increment command usage metric in db
  writeCommandMetric(cmd.command.info.name[0], message.guild ? message.guild.id : 'DM');
}

const handleMessage = function(bot, message) {
  // See if there's an active request to process
  this.handleActiveRequest(bot, message);

  // Otherwise, find an appropriate command handler
  const cmd = this.fetchCommand(message.content, message.guild ? message.guild.id : null);

  if (cmd) {
    log.info(`Command ${cmd.name} requested by ${message.author.tag}`, { origin: 'message-handler', requestId: message.requestId });

    // Check rate limiter, if available
    if (cmd.command.info.rateLimiter) {
      cmd.command.info.rateLimiter(message.author.id, function(err, timeLeft, actionsLeft) {
        if (err) {
          log.warn('Rate limiting failed', e);
        }
        
        if (timeLeft) {
          // Limit exceeded
          return message.reply('please slow down. You can use this command again in ' +
            moment.duration(Math.ceil(timeLeft / 1000) * 1000).format('d[d] h[h] m[m] s[s]') + '.');
        } else {
          runCommand(bot, message, cmd);
        }
      });
    } else {
      runCommand(bot, message, cmd);
    }
  } else {
    // See if there's an image command that fits this request
    const prefix = Utils.getPrefix(message.guild.id);
    const settings = serverSettingsManager.getSettings(message.guild.id);
    const useDefaultPrefix = settings && settings.prefix && settings.prefix.useDefault;

    let imageRequest = '';

    if (message.content.indexOf(prefix) === 0) {
      imageRequest = message.content.substring(prefix.length, message.content.length);
    } else if (useDefaultPrefix && message.content.indexOf(config.prefix) === 0) {
      imageRequest = message.content.substring(config.prefix.length, message.content.length);
    }

    if (imageRequest) {
      const imageResponse = imageHandler.getImageCommand(imageRequest, message.guild.id);

      if (imageResponse) {
        imageResponse.then(url => {
          if (url) {
            // If it's a local asset, send the file directly
            if (url.indexOf('local:') === 0) {
              const path = url.split('local:')[1];
              const filename = path.split('/').pop();
              message.channel.send('', { files: [ new Discord.Attachment(path, filename) ] })
            } else {
              // If not, send the URL as a response
              message.reply(url);
            }
          }
        });
      }
    }
  }
};

const fetchCommand = function(content, guildId) {
  const prefix = Utils.getPrefix(guildId);
  const settings = serverSettingsManager.getSettings(guildId)
  const useDefaultPrefix = settings && settings.prefix && settings.prefix.useDefault;

  try {
    if (content.indexOf(prefix) === 0) {
      return parseCommand(content.substring(prefix.length, content.length));
    } else if (useDefaultPrefix && content.indexOf(config.prefix) === 0) {
      return parseCommand(content.substring(config.prefix.length, content.length));
    }
  } catch (e) {
    log.warn(e);
  }
};

const loadCommands = function() {
  try {
    log.info('Loading commands...');
    const filenames = fs.readdirSync(global.paths.commands);

    if (commands.length === 0) {
      for (let index in filenames) {
        try {
          log.info(' -Loading ' + filenames[index]);
          const command = require(global.paths.commands + filenames[index]);
          commands.push(command);
        } catch (e) {
          log.warn('    WARN: Could not load command. ', e);
        }
      }
    }
    
    log.info('Commands loaded!');
  } catch (err) {
    log.error('Unable to load command.', err);
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
      log.warn('Message handling failed', e);
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

    if (flags) {
      for (let i = splitInput.length - 1; i >= 0; i--) {
        let part = splitInput[i];

        if (part.indexOf('-') === 0 && flags[part.substring(1, part.length)] !== undefined) {
          if (!cmd.flags) cmd.flags = {};
          cmd.flags[part.substring(1, part.length)] = splitInput.splice(i).splice(1).join(' ');
        }
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
