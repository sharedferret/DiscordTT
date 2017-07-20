const info = {
  name: ['anime '],
  description: 'Anime search.',
  usage: '`' + config.discriminator + '`anime [search string]: Search for and display information about an anime.',
  type: CommandType.General
};

const Discord = require('discord.js');
const request = require('request');

const handleMessage = function(bot, message) {
  console.log('entering anime');
  const searchString = message.content.substring(config.discriminator.length + 6, message.content.length);
  console.log('searching for' + searchString);
  request({
    url: 'https://kitsu.io/api/edge/anime?filter%5btext%5d=' + encodeURIComponent(searchString) + '&page%5blimit%5d=1',
//    json: true
  }, function(err, response, body) {
    try {
      const parsedBody = JSON.parse(body);

      const result = parsedBody.data[0];

      // Grab streaming links
      request('https://kitsu.io/api/edge/anime/' + result.id + '/streaming-links',
      function(slErr, slResponse, slBody) {
        const parsedSlBody = JSON.parse(slBody);
        const streamingLinkData = parsedSlBody.data;

        const streamingLinks = [];

        for (const streamingLink of streamingLinkData) {
          streamingLinks.push(streamingLink.attributes.url);
        }

        const embed = new Discord.RichEmbed();

        embed.setTitle(result.attributes.canonicalTitle);
        embed.setDescription(result.attributes.synopsis);

        embed.addField('Type', result.attributes.subtype, true);
        embed.addField('Episodes', result.attributes.episodeCount, true);
        embed.addField('Status', result.attributes.status, true);
        embed.addField('Rating', result.attributes.averageRating, true);
        embed.addField('Popularity', result.attributes.popularityRank, true);
        embed.addField('Aired', result.attributes.startDate + ' to ' + result.attributes.endDate, true);
        embed.addField('Link', 'https://kitsu.io/anime/' + result.attributes.slug);

        if (streamingLinks.length > 0) {
          embed.addField('Streaming Links', streamingLinks.join('\n'));
        }
        
        const altTitles = [];
        if (result.attributes.titles.en) altTitles.push('_Romanized_: ' + result.attributes.titles.en);
        if (result.attributes.titles.ja_jp) altTitles.push('_Japanese_: ' + result.attributes.titles.ja_jp); 
        embed.addField('Alternate Titles', altTitles.join('\n'));

        // TODO: Cache this data

        embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
        embed.setTimestamp(new Date());
        embed.setThumbnail(result.attributes.posterImage.small);

        message.channel.send('', { embed: embed });
      });
    } catch (e) {
      console.warn('anime lookup failure', e);
    }
  });
};

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'anime');
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
