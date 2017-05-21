# hapi-auto-handler [![Build Status](https://travis-ci.org/firstandthird/hapi-auto-handler.svg?branch=master)](https://travis-ci.org/firstandthird/hapi-auto-handler)

## Hapi plugin that makes it easy to write route handlers that perform complex asynchronous processing flows.

## Background
The __[async](http://caolan.github.io/async/index.html)__ library is a popular module for working with asynchronous JavaScript. One of the most powerful methods it provides is __[async.auto](http://caolan.github.io/async/docs.html#auto)__, which lets you describe and execute complex parallel dependency graphs with one easy-to-read JavaScript object. This plugin makes it simple to incorporate __async.auto__ (and its cousin __async.autoInject__) into your hapi route handlers and return the results to the caller.


## Install

```
npm install hapi-auto-handler
```

## Use (auto mode)


```js
const Hapi = require('hapi');
const server = new Hapi.Server({});

server.register({
  register: require('hapi-auto-handler'),
  options: {}
}, () => {
  server.route({
    path: '/example/{theInput}',
    method: 'GET',
    handler: {
      // hapi-auto-handler recognizes the 'auto' keyname and will generate the route handler for you:
      auto: {
        first: (done) => {
          done(null, 'first');
        },
        second: (done) => {
          done(null, 'second');
        },
        // third only runs after first and second are done:
        third: ['first', 'second', (results, done) => {
          done(null, results.first + results.second);
        }],
        // make your method depend on 'request' to access the request object:
        fourth: ['third', 'request', 'reply', (results, done) => {
          // results.request is now the request object:
          reply(null, results.third + results.request.params.theInput)
          done();
        }]
      }
    }
  });
});
```
## Use (autoInject mode)


```js
const Hapi = require('hapi');
const server = new Hapi.Server({});

server.register({
  register: require('hapi-auto-handler'),
  options: {}
}, () => {
  server.route({
    path: '/example/{theInput}',
    method: 'GET',
    handler: {
      // hapi-auto-handler recognizes the 'autoInject' keyname and will generate the route handler for you:
      autoInject: {
        first(done) {
          done(null, 'first');
        },
        second(done) {
          done(null, 'second');
        },
        // third only runs after first and second are done:
        third(first, second, done) {
          done(null, first + second);
        },
        // make your method depend on 'request' to access the request object:
        final(third, request, reply, done) {
          // request is now the request object:
          reply(null, third + request.params.theInput);
          done();
        }
      }
    }
  });
});
```
## Features:

### Special Dependencies
- ***settings***: can be specified in the dependency list for a method to make the hapi __server.settings.app__ object available inside the method:
```js
  server.settings.app.value1 = 'hey'
  ...
  getSettingsStuff: ['settings', (results, done) => {
    const settings = results.settings.app.value1;
  }]
  ...
```
- ***request***: can be specified in the dependency list for a method to make the hapi __[request](http://hapijs.com/api#requests)__ object available inside the method:
```js
...
  getRequestStuff: ['request', (results, done) => {
    const request = results.request;
    const userName = request.query.firstName + ' ' + request.query.lastName;
    done(null, userName);
  }]
  ...
```
- ***server***: can be specified in the dependency list for a method to make the hapi __[server](http://hapijs.com/api#server)__ object available inside the method:
```js
...
  getServerStuff: ['server', (results, done) => {
    const server = results.server;
    const serverName = server.info.id + '@' + server.info.host + ':'' + server.info.port'
    done(null, serverName);
  }]
  ...
```

- ***reply***: can be specified in the dependency list for a method. Anything passed to that gets send back to the client.
```js
...
  finished(reply, done) => {
    // this route will always respond with "Hello World!"
    reply(null, "Hello World!");
    done();
  }
  ...
```
