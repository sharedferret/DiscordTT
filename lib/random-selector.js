var extend = require('util')._extend;

var select = function(opts) {
  var weights = extend({}, opts);

  // Convert weights to summed values
  var sum = 0;
  for (var i in weights) {
    weights[i] += sum;
    sum = weights[i];
  }

  var randomNumber = Math.random() * sum;

  for (var i in weights) {
    if (randomNumber <= weights[i]) {
      return i;
    }
  }

  return null;
};

var selectFile = function(directory) {

};

module.exports = {
  select: select
};
