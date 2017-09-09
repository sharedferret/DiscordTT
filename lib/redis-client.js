const redis = require('redis');
const client = redis.createClient();

client.on('error', function(err) {
  log.warn('Redis error', err);
});

client.on('ready', function() {
  log.info('Redis ready');
});

const exit = function() {
  client.quit();
}

module.exports = {
  client: client,
  exit: exit
}
