'use strict';
const code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const autoPlugin = require('../');
const Boom = require('boom');

lab.experiment('hapi-auto-handler', () => {
  let server;

  lab.beforeEach(() => {
    server = new Hapi.Server({
      debug: {
        log: ['warning'],
        //request: ['error']
      },
      app: {
        key: 'value'
      },
      port: 3000
    });
  });

  lab.afterEach(async () => {
    await server.stop();
  });

  lab.test('allows a basic auto handler', async () => {
    const calledStatements = [];
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
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
          reply: ['first', 'second', 'third', (results, done) => {
            done(null, { third: results.third });
          }]
        }
      }
    });
    await server.start();
    const response = await server.inject('/example');
    code.expect(response.statusCode).to.equal(200);
    code.expect(calledStatements).to.include('first');
    code.expect(calledStatements).to.include('second');
    code.expect(calledStatements).to.include('third');
    code.expect(response.result.third).to.equal('the_third_result');
  });

  lab.test(' will return the result of the "reply" function if it was defined', async() => {
    const calledStatements = [];
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
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
    await server.start();
    const response = await server.inject('/example');
    code.expect(response.statusCode).to.equal(200);
    code.expect(response.result).to.equal('the_third_result');
  });

  lab.test(' will return a redirect if redirect is defined', async() => {
    const calledStatements = [];
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/redir-example',
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
          redirect: ['third', (results, done) => {
            done(null, '/go-to-here');
          }],
          reply: ['third', (results, done) => {
            done(null, results.third);
          }]
        }
      }
    });
    await server.start();
    const response = await server.inject('/redir-example');
    code.expect(response.statusCode).to.equal(302);
    code.expect(response.headers.location).to.equal('/go-to-here');
  });

  lab.test(' will set a state if setState is defined', async() => {
    const calledStatements = [];
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/redir-example',
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
          setState: ['third', (results, done) => {
            done(null, { name: 'newstate', data: '890jdksfgu893rgjhksdfkjhdsfgdsf' });
          }],
          reply: ['third', (results, done) => {
            done(null, results.third);
          }]
        }
      }
    });
    await server.start();
    const response = await server.inject('/redir-example');
    code.expect(response.headers['set-cookie'][0]).to.startWith('newstate=890jdksfgu893rgjhksdfkjhdsfgdsf');
    code.expect(response.statusCode).to.equal(200);
  });

  lab.test(' makes the "server" and "request" objects available within the auto methods ', async () => {
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
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
          }],
          reply: ['first', 'second', 'third', (results, done) => {
            done(null, { first: results.first, second: results.second, third: results.third });
          }]
        }
      }
    });
    await server.start();
    const response = await server.inject('/example');
    code.expect(response.statusCode).to.equal(200);
    code.expect(typeof response.result.first).to.equal('object');
    code.expect(response.result.first.host).to.equal(server.info.host);
    code.expect(typeof response.result.second).to.equal('object');
    code.expect(response.result.second.host).to.equal(server.info.host);
  });

  lab.test(' makes the "setting" object available within the auto methods ', async () => {
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/example',
      method: 'GET',
      handler: {
        auto: {
          // make a dependency on 'server' to make results.server available within your method:
          reply: ['settings', (results, done) => {
            done(null, results.settings);
          }]
        }
      }
    });
    await server.start();
    const response = await server.inject('/example');
    code.expect(response.statusCode).to.equal(200);
    code.expect(typeof response.result).to.equal('object');
    code.expect(response.result.key).to.equal('value');
  });

  lab.test(' returns errors', async () => {
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/example',
      method: 'GET',
      handler: {
        auto: {
          first: (done) => {
            done(new Error('error'));
          },
          second: ['first', (results, done) => {
            done(null, 'fail');
          }]
        }
      }
    });
    await server.start();
    const response = await server.inject('/example');
    code.expect(response.statusCode).to.equal(500);
  });
  lab.test(' returns Boom errors', async () => {
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/example',
      method: 'GET',
      handler: {
        auto: {
          first: (done) => {
            done(Boom.notFound());
          },
          second: ['first', (results, done) => {
            done(null, 'fail');
          }]
        }
      }
    });
    await server.start();
    const response = await server.inject('/example');
    code.expect(response.statusCode).to.equal(404);
  });
  lab.test(' returns string errors as Boom', async () => {
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/example',
      method: 'GET',
      handler: {
        auto: {
          first: (done) => {
            done('you have made a grave mistake');
          },
          second: ['first', (results, done) => {
            done(null, 'fail');
          }]
        }
      }
    });
    await server.start();
    const response = await server.inject('/example');
    code.expect(response.statusCode).to.equal(500);
  });

  lab.test(' returns values of other type ', async () => {
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/example',
      method: 'GET',
      handler: {
        auto: {
          first: (done) => {
            done('you have made a grave mistake');
          },
          second: ['first', (results, done) => {
            done(null, 'fail');
          }]
        }
      }
    });
    await server.start();
    const response = await server.inject('/example');
    code.expect(response.statusCode).to.equal(500);
  });

  lab.test(' handles the "autoInject" parameter', async () => {
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/example',
      method: 'GET',
      handler: {
        autoInject: {
          first: (done) => {
            done(null, 1);
          },
          third: (first, done) => {
            code.expect(first).to.equal(1);
            done(null, 2);
          },
          reply: (first, third, done) => {
            code.expect(first + third).to.equal(3);
            done();
          }
        }
      }
    });
    await server.start();
    const res = await server.inject('/example');
    code.expect(res.statusCode).to.equal(200);
  });

  lab.test('uses root server if things are defined after plugin', async () => {
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/example',
      method: 'GET',
      handler: {
        autoInject: {
          first(server, done) { // eslint-disable-line no-shadow
            done(null, server.test());
          },
          reply(first, done) {
            code.expect(first).to.equal(true);
            done(null, 'ok');
          }
        }
      }
    });
    server.decorate('server', 'test', () => true);
    await server.start();
    const res = await server.inject('/example');
    code.expect(res.statusCode).to.equal(200);
  });

  lab.test(' handles the "headers" parameter', async () => {
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/example',
      method: 'GET',
      handler: {
        autoInject: {
          first: (done) => {
            done(null, 1);
          },
          third: (first, done) => {
            code.expect(first).to.equal(1);
            done(null, 2);
          },
          setHeaders: (first, done) => done(null, { 'content-type': 'application/mp3' }),
          reply: (first, third, setHeaders, done) => {
            code.expect(first + third).to.equal(3);
            done();
          }
        }
      }
    });
    await server.start();
    const res = await server.inject('/example');
    code.expect(res.headers['content-type'], 'application/mp3');
    code.expect(res.statusCode).to.equal(200);
  });

  lab.test('pass in h and return reply function', async () => {
    await server.register({ plugin: autoPlugin, options: {} });
    server.route({
      path: '/',
      method: 'GET',
      handler: {
        autoInject: {
          reply(h, done) {
            done(null, h.redirect('/redirect'));
          }
        }
      }
    });
    await server.start();
    const response = await server.inject('/');
    code.expect(response.statusCode).to.equal(302);
    await server.stop();
  });

  lab.test('multiple requests to same - make sure not caching reply object', async() => {
    let count = 0;
    await server.register({
      plugin: autoPlugin,
      options: {}
    });
    server.route({
      path: '/',
      method: 'GET',
      handler: {
        autoInject: {
          reply(h, done) {
            const res = h.response('ok');
            res.header('x-test', count);
            count++;
            done(null, res);
          }
        }
      }
    });
    await server.start();
    const response = await server.inject('/');
    code.expect(response.statusCode).to.equal(200);
    code.expect(response.headers['x-test']).to.equal(0);
    const res2 = await server.inject('/');
    code.expect(res2.statusCode).to.equal(200);
    code.expect(res2.headers['x-test']).to.equal(1);
    await server.stop();
  });
});
