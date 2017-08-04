'use strict';

const path = require('path');
const appRoot = path.resolve(__dirname);

global.config = require('./config');
global._ = require('lodash');

global.paths = {
  root: appRoot,
  assets: appRoot + '/assets/',
  audio: appRoot + '/assets/audio/',
  images: appRoot + '/assets/images/',
  lib: appRoot + '/lib/',
  commands: appRoot + '/commands/'
};

global.startTime = new Date();
global.CommandType = require(global.paths.lib + 'commandtypes');
global.Utils = require(global.paths.lib + 'utils');

// Local cache for Google geocoding responses, better than nothing
// TODO [#60]: Replace with redis
global.locationCache = {};
