const pkg = require(global.paths.root + '/package.json');
const moment = require('moment');
const db = require(global.paths.lib + 'database-client').db;
require('moment-precise-range-plugin');

const handleMessage = function(bot, message, input) {
  let query = 'SELECT s.url as url, s.title as title, count(*) as count FROM SongHistory h LEFT JOIN Song s ON h.songId = s.id ';

  const whereParameters = [];
  const queryParams = [];

  // If the global flag is not present, limit search to the current guild
  if (!(input.flags && input.flags.global)) {
    whereParameters.push('h.serverId = ?');
    queryParams.push(message.guild.id);
  }

  switch (input.input) {
    case 'day':
      whereParameters.push('h.time > ?');
      queryParams.push(moment().subtract(1, 'day').valueOf());
      break;
    case 'week':
      whereParameters.push('h.time > ?');
      queryParams.push(moment().subtract(1, 'week').valueOf());
      break;
    case 'month':
      whereParameters.push('h.time > ?');
      queryParams.push(moment().subtract(1, 'month').valueOf());
      break;
    default:
      break;
  }

  if (whereParameters.length > 0) {
    query += 'WHERE ';
    query += whereParameters.join(' AND ');
    query += ' ';
  }

  query += 'GROUP BY h.songId ORDER BY count DESC LIMIT 10';
  db.all(query, queryParams, (err, rows) => {
    const embed = Utils.createEmbed(message);

    embed.setTitle('Most Played Songs');
    
    const descriptionRows = [];

    for (const i in rows) {
      descriptionRows.push(`${parseInt(i) + 1}. ${rows[i].title} _(${rows[i].count} play${rows[i].count == 1 ? '' : 's'})_`);
    }
    
    if (descriptionRows.length > 0) {
      embed.setDescription(descriptionRows.join('\n'));
    }

    message.channel.send('', { embed: embed });
  });
};

const info = {
  name: ['mostplayed'],
  description: 'Find out about Tohru!',
  type: CommandType.Utility,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'Show the most played songs on this server.',
        'day': '...from the last day.',
        'week': '...from the last week.',
        'month': '...from the last month.'
      },
      flags: {
        global: 'Search across all servers',
        // user: 'Provide a @ tag after this flag to find the most played songs from a specific user (default: self)',
        // me: 'Display only songs played by the requester'
      }
    }
  }
};

module.exports = {
  info: info
};
