const extend = require('util')._extend;

const select = function(opts) {
  const weights = extend({}, opts);

  // Convert weights to summed values
  let sum = 0;
  for (let i in weights) {
    weights[i] += sum;
    sum = weights[i];
  }

  const randomNumber = Math.random() * sum;

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
