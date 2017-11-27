'use strict';
const async = require('async');
const defaultMethod = require('lodash.defaults');
const unset = require('lodash.unset');
const Boom = require('boom');
const defaults = {};

const register = async(server, options) => {
  options = defaultMethod(options, defaults);
  const getReplyHandler = (autoMethod, autoOptions) => {
    const legacy = (autoOptions.reply);
    let replyCalled = false;
    return async (request, h) => {
      // a copy of the server is available within the auto methods as results.server:
      autoOptions.server = (done) => {
        done(null, server);
      };
      // a copy of the request is avilable within the auto methods as results.request:
      autoOptions.request = (done) => {
        done(null, request);
      };
      // a copy of the settings is avilable within the auto methods as results.settings:
      autoOptions.settings = (done) => {
        done(null, request.server.settings.app);
      };
      // a copy of the h reply object is available within the auto methods as results.h:
      autoOptions.h = (done) => {
        return done(null, h);
      }

      if (!legacy) {
        autoOptions.reply = (done) => {
          replyCalled = true;
          done(null, h);
        };
      }
      // run the async.auto or autoInject expression:
      const response = await new Promise((resolve, reject) => {
        autoMethod(autoOptions, (err, results) => {
          if (err && !replyCalled) {
            if (err.isBoom) {
              return reject(err);
            }
            if (typeof err === 'string') {
              err = new Error(err);
            }
            if (err instanceof Error) {
              return reject(Boom.wrap(err));
            }
            return reject(err);
          }
          if (err) {
            server.log(['warning'], err);
          }
          if (autoOptions.reply) {
            const replyObj = h.response(results.reply);
            if (results.redirect) {
              replyObj.redirect(results.redirect).temporary();
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
            return resolve(replyObj);
          }
          // must unset these before hapi can return the results object:
          unset(results, 'server');
          unset(results, 'request');
          unset(results, 'h');
          return resolve(h.response(results));
        });
      });
      return response;
    };
  };

  // define an 'auto' handler that routes can use:
  server.decorate('handler', 'auto', (route, autoOptions) => getReplyHandler(async.auto, autoOptions));
  // define an 'autoInject' handler that routes can use:
  server.decorate('handler', 'autoInject', (route, autoOptions) => getReplyHandler(async.autoInject, autoOptions));
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
