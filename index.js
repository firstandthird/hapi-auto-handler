'use strict';
const async = require('async');
const defaultMethod = require('lodash.defaults');
const unset = require('lodash.unset');
const Boom = require('boom');
const defaults = {};

exports.register = (server, options, next) => {
  options = defaultMethod(options, defaults);
  // define an 'auto' handler that routes can use:
  server.handler('auto', (route, autoOptions) => {
    return (request, reply) => {
      // a copy of the server is available within the auto methods as results.server:
      autoOptions.server = (done) => {
        done(null, server);
      };
      // a copy of the request is avilabable within the auto methods as results.request:
      autoOptions.request = (done) => {
        done(null, request);
      };
      autoOptions.settings = (done) => {
        done(null, request.server.settings.app);
      };
      // run the async.auto expression:
      async.auto(autoOptions, (err, results) => {
        if (err) {
          if (err.isBoom) {
            return reply(err);
          }

          return reply(Boom.wrap(err));
        }
        if (autoOptions.reply) {
          return reply(results.reply);
        }
        // must unset these before hapi can return the results object:
        unset(results, 'server');
        unset(results, 'request');
        reply(results);
      });
    };
  });
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
