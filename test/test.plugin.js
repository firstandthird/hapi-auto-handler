'use strict';
const code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const autoPlugin = require('../');

lab.experiment('hapi-auto-handler', () => {
  let server;
  lab.beforeEach((done) => {
    server = new Hapi.Server({
      debug: {
        log: ['warning']
      }
    });
    server.connection({ port: 3000 });
    done();
  });
  lab.test(' allows a basic auto handler', (allDone) => {
    const calledStatements = [];
    server.register({
      register: autoPlugin,
      options: {}
    }, () => {
      server.route({
        path: '/example',
        method: 'GET',
        handler: {
          auto: {
            first: (done) => {
              calledStatements.push('first');
              done();
            },
            second: (done) => {
              calledStatements.push('second');
              done();
            },
            third: ['first', 'second', (results, done) => {
              calledStatements.push('third');
              done(null, 'the_third_result');
            }]
          }
        }
      });
      server.start(() => {
        server.inject('/example', (response) => {
          code.expect(response.statusCode).to.equal(200);
          code.expect(calledStatements).to.include('first');
          code.expect(calledStatements).to.include('second');
          code.expect(calledStatements).to.include('third');
          code.expect(response.result.third).to.equal('the_third_result');
          allDone();
        });
      });
    });
  });
  lab.test(' will return the result of the "reply" function if it was defined', (allDone) => {
    const calledStatements = [];
    server.register({
      register: autoPlugin,
      options: {}
    }, () => {
      server.route({
        path: '/example',
        method: 'GET',
        handler: {
          auto: {
            first: (done) => {
              calledStatements.push('first');
              done();
            },
            second: (done) => {
              calledStatements.push('second');
              done();
            },
            third: ['first', 'second', (results, done) => {
              calledStatements.push('third');
              done(null, 'the_third_result');
            }],
            reply: ['third', (results, done) => {
              done(null, results.third);
            }]
          }
        }
      });
      server.start(() => {
        server.inject('/example', (response) => {
          code.expect(response.statusCode).to.equal(200);
          code.expect(response.result).to.equal('the_third_result');
          allDone();
        });
      });
    });
  });
  lab.test(' makes the "server" and "request" objects available within the auto methods ', (allDone) => {
    server.register({
      register: autoPlugin,
      options: {}
    }, () => {
      server.route({
        path: '/example',
        method: 'GET',
        handler: {
          auto: {
            // make a dependency on 'server' to make results.server available within your method:
            first: ['server', (results, done) => {
              // results.server will be set to the hapi server:
              done(null, results.server.info);
            }],
            // make a dependency on 'request' to make results.request available within your method:
            second: ['request', (results, done) => {
              // results.request will be set to the incoming request:
              done(null, results.request.server.info);
            }],
            third: ['first', 'second', (results, done) => {
              done(null, 'the_third_result');
            }]
          }
        }
      });
      server.start(() => {
        server.inject('/example', (response) => {
          code.expect(response.statusCode).to.equal(200);
          code.expect(typeof response.result.first).to.equal('object');
          code.expect(response.result.first.host).to.equal(server.info.host);
          code.expect(typeof response.result.second).to.equal('object');
          code.expect(response.result.second.host).to.equal(server.info.host);
          allDone();
        });
      });
    });
  });
});
