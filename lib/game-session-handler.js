var moment = require('moment');
var gameSessions = [];

var populateGameSessions = function(bot) {
  console.log('populating game sessions');

  var servers = bot.servers;
  for (var i in servers) {
    var server = servers[i];
    if (!server) {
      continue;
    }

    var users = server.members;

    for (var j in users) {
      var user = users[j];

      if (user && !user.bot && user.game) {
        // Check if the user already has a game session
        var gameSession = _.find(gameSessions, { id: user.id });

        // If not, add one
        if (!gameSession) {
          console.log('adding game session for ' + user.username + ', playing ' + user.game.name);
          gameSessions.push({
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            gameType: user.game.type,
            game: user.game.name,
            startTime: moment()
          });
        }
      }
    }
  }
};

var presenceUpdated = function(staleUser, user) {
  // TODO: Handle case where a user jumps from one game to another
  // TODO: Check for edge cases - this is missing some updates
  if (user.game) {
    // Check if the user already has a game session
    var gameSession = _.find(gameSessions, { id: user.id });

    // If not, add one
    if (!gameSession) {
      gameSessions.push({
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        gameType: user.game.type,
        game: user.game.name,
        startTime: moment()
      });
    }
  } else {
    // Check if there's an active game session
    var gameSession = _.find(gameSessions, { id: user.id });

    // If so, close and log it
    if (gameSession) {
      console.log('Removing session for ' + user.username);
      var endTime = moment();
      var secondsElapsed = endTime.diff(gameSession.startTime, 'seconds');
      console.log(user.username + '#' + user.discriminator + ' played '
        + gameSession.game + ' for ' + secondsElapsed + ' seconds.');
      gameSessions.splice(gameSession, 1);
    }
  }

  console.log(user.username + '#' + user.discriminator + ' is now playing '
    + (user.game ? user.game.name : 'no game') + '.');
};

var displayGames = function(bot, userId) {
  // TODO: Limit this response to the caller's server

  var response = '';
  for (var i in gameSessions) {
    var gameSession = gameSessions[i];
    response += gameSession.username + ' has been playing ' + gameSession.game
      + ' for ' + moment(gameSession.startTime).fromNow(true) + '\n';
  }

  return response;
}

module.exports = {
  populateGameSessions: populateGameSessions,
  presenceUpdated: presenceUpdated,
  displayGames: displayGames
};
