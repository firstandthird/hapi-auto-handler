'use strict';
const async = require('async');
const defaultMethod = require('lodash.defaults');
const unset = require('lodash.unset');
const Boom = require('boom');
const defaults = {};

exports.register = (server, options, next) => {
  options = defaultMethod(options, defaults);
  const getReplyHandler = (autoMethod, autoOptions) => {
    const legacy = (autoOptions.reply);
    let replyCalled = false;
    return (request, reply) => {
      // a copy of the server is available within the auto methods as results.server:
      autoOptions.server = (done) => {
        done(null, server.root);
      };
      // a copy of the request is avilabable within the auto methods as results.request:
      autoOptions.request = (done) => {
        done(null, request);
      };
      autoOptions.settings = (done) => {
        done(null, request.server.settings.app);
      };
      if (!legacy) {
        autoOptions.reply = (done) => {
          replyCalled = true;
          done(null, reply);
        };
      }
      // run the async.auto or autoInject expression:
      autoMethod(autoOptions, (err, results) => {
        if (err && !replyCalled) {
          if (err.isBoom) {
            return reply(err);
          }
          if (typeof err === 'string') {
            err = new Error(err);
          }
          if (err instanceof Error) {
            return reply(Boom.wrap(err));
          }
          return reply(err).code(500);
        }
        if (!legacy) {
          return;
        }

        if (autoOptions.reply) {
          const replyObj = reply(results.reply);
          if (results.redirect) {
            replyObj.redirect(results.redirect);
          }
          if (results.setState) {
            const name = results.setState.name;
            const data = results.setState.data;
            replyObj.state(name, data);
          }
          if (results.setHeaders) {
            Object.keys(results.setHeaders).forEach((key) => {
              replyObj.header(key, results.setHeaders[key]);
            });
          }
          return replyObj;
        }
        // must unset these before hapi can return the r esults object:
        unset(results, 'server');
        unset(results, 'request');
        reply(results);
      });
    };
  };

  // define an 'auto' handler that routes can use:
  server.handler('auto', (route, autoOptions) => getReplyHandler(async.auto, autoOptions));
  // define an 'autoInject' handler that routes can use:
  server.handler('autoInject', (route, autoOptions) => getReplyHandler(async.autoInject, autoOptions));
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
