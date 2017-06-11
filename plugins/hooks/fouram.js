const scheduler = require('node-schedule');

const init = function(bot) {
  /** 
  this.bot = bot;
  scheduler.scheduleJob('0 0 4 * * *', function() {
    bot.sendMessage(bot.channels[0],
      "https://www.youtube.com/watch?v=9t5E206E3fU",
      { tts: false },
      function(error, message) {
        //
      });
  }); */
};

module.exports = {
  init: init
};
