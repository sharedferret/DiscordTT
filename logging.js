global.winston = require('winston');
require('winston-daily-rotate-file');

global.log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      useConsole: true,
      colorize: true,
      stderrLevels: ['error']
    }),
    new (winston.transports.DailyRotateFile)({
      name: 'tohru',
      filename: 'tohru.log',
      datePattern: 'logs/yyyy-MM-dd.',
      prepend: true,
      level: process.env.ENV === 'development' ? 'debug' : 'info',
      json: false,
      formatter: (options) => {
        let requestId = '';
        let origin = '';

        if (options.meta && options.meta.requestId) {
          requestId = options.meta.requestId;
          delete options.meta.requestId;
        }

        if (options.meta && options.meta.origin) {
          origin = options.meta.origin;
          delete options.meta.origin;
        }

        return `${new Date().toISOString()} [${options.level.toUpperCase()}] ${requestId ? '[' + requestId + ']' : ''} ${origin ? origin + ' -' : ''} ${options.message ? options.message : ''} ${options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta) : ''}`
      }
    }),
    new (winston.transports.DailyRotateFile)({
      name: 'tohru-error',
      filename: 'tohru-error.log',
      datePattern: 'logs/yyyy-MM-dd.',
      prepend: true,
      level: 'error'
    })
  ]
});
