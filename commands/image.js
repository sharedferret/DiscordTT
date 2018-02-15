const imageHandler = require(global.paths.lib + 'image-handler');
const Discord = require('discord.js');

const handleMessage = (bot, message, input) => {
  const response = imageHandler.getImageCommand(input.input, message.guild.id);

  if (response) {
    response.then(url => {
      if (url) {
        // If it's a local asset, send the file directly
        if (url.indexOf('local:') === 0) {
          const path = url.split('local:')[1];
          const filename = path.split('/').pop();
          message.channel.send('', { files: [ new Discord.Attachment(path, filename) ] })
        } else {
          // If not, send the URL as a response
          message.channel.send(url);
        }
      } else {
        message.reply('no image found.');
      }
    })
  } else {
    message.reply('no image found.');
  }
};

const addImageCommand = (bot, message, input) => {
  if (Utils.isGuildAdmin(message.member)) {
    const cmd = input.input.split(' ');
    const requestedCommand = cmd.shift();
    const requestedUrl = cmd.join(' ');
    imageHandler.addImageCommand(message, message.guild.id, message.author.id, requestedCommand, requestedUrl);
  } else {
    message.reply('you must be a guild administrator to use this command.');
  }
}

const removeImageCommand = (bot, message, input) => {
  if (Utils.isGuildAdmin(message.member)) {
    imageHandler.removeImageCommand(message, message.guild.id, message.author.id, input.input);
  } else {
    message.reply('you must be a guild administrator to use this command.');
  }
}

const removeImageFromCommand = (bot, message, input) => {
  // not yet implemented
}

const info = {
  name: ['image'],
  description: 'Set and retrieve custom image commands.',
  type: CommandType.Utility,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'List available image commands.',
        '[image command name]': 'Display an image for the given image command.'
      }
    },
    add: {
      handler: addImageCommand,
      usage: {
        '[command name] [image URL]': 'Adds a new custom image command. Command names should not contain spaces. Image commands can be used with `/image command` or `/command`. The `/command` variant will be unavailable if a global command with the same name exists. If an image command already exists with the given name, this command will add the new URL as an additional option for the image command, with an equal chance of each image being returned.'
      }
    },
    addImage: {
      handler: addImageCommand,
      usage: {
        '[command name] [image URL]': 'Adds a new custom image command. Command names should not contain spaces. Image commands can be used with `/image command` or `/command`. The `/command` variant will be unavailable if a global command with the same name exists. If an image command already exists with the given name, this command will add the new URL as an additional option for the image command, with an equal chance of each image being returned.'
      }
    },
    removeImage: {
      handler: removeImageFromCommand,
      usage: {
        '[command name] [image URL]': 'Removes a single image from an image command. If the given URL is the only image in the image command, removes the entire command.'
      }
    },
    remove: {
      handler: removeImageCommand,
      usage: {
        '[command name]': 'Removes an image command.'
      }
    }
  }
};

module.exports = {
  info: info
};
