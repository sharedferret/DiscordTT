// Pass-through cache manager for external API calls. Redis-backed.

const redis = require(global.paths.lib + 'redis-client').client;

/**
 * Makes a pass-through cached API call.
 * @param {string} requestKey A unique key for the request being made. Takes the form of a string containing the API call being made and the unique request data for the call.
 * @param {int} cacheTime The amount of time a successful API response should be cached, in seconds.
 * @param {function} apiCall The external API call to be made. This should take the form of a function that returns the response from the external API (e.g. a request call).
 *                           The apiCallHandler function will be passed as the last/callback argument to this function.
 * @param {function} apiCallHandler A handler function to transform the API's response to one parseable by this class. This function will contain the response properties
 *                                  from the apiCall function, with a callback handler bound to it (in position 0). This function should return an object with two properties:
 *                                  err and response. err should be populated if the call failed for any reason - if the err property is set, this function will not attempt
 *                                  to cache the result and will return the object pair unmodified to the callee. The response object should contain the raw response from the 
 *                                  external API. This value will be cached in redis and returned to the callee.
 * @param {function} callback The callback function that will be invoked after data for this API call is retrieved.
 */
const makeCachedApiCall = (requestKey, cacheTime, apiCall, apiCallHandler, cb) => {
  const redisRequestKey = 'Cache:' + requestKey;

  log.debug(`Requesting key ${redisRequestKey} from Redis`);

  redis.get(redisRequestKey, (redisErr, redisResult) => {
    if (!redisErr && redisResult !== null) {
      log.silly('Redis returned value', redisResult);

      return cb.apply(this, [redisErr, JSON.parse(redisResult)]);
    }

    // No match or redis error - make the API call
    apiCall.call(this, apiCallHandler.bind(this, (err, response) => {
      if (err) return cb.apply(this, [err, response]);

      // Cache result
      log.debug(`Adding API response to Redis with key ${redisRequestKey} and expiry ${cacheTime}`);
      log.silly('Content: ', response);

      redis.set(redisRequestKey, JSON.stringify(response), 'EX', cacheTime);

      // Return result
      cb.apply(this, [err, response]);
    }));
  })
};

module.exports = {
  makeCachedApiCall: makeCachedApiCall
};
