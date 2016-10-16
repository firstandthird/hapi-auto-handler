# hapi-auto-handler [![Build Status](https://travis-ci.org/firstandthird/hapi-auto-handler.svg?branch=master)](https://travis-ci.org/firstandthird/hapi-auto-handler)

## Hapi plugin that makes it easy to write route handlers that perform complex asynchronous processing flows.

## Background
The __[async](http://caolan.github.io/async/index.html)__ library is a popular module for working with asynchronous JavaScript. One of the most powerful methods it provides is __[async.auto](http://caolan.github.io/async/docs.html#auto)__, which lets you describe and execute complex parallel dependency graphs with one easy-to-read JavaScript object. This plugin makes it simple to incorporate __async.auto__ into your hapi route handlers and return the results to the caller.


## Install

```
npm install hapi-auto-handler
```

## Use


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
        fourth: ['third', 'request', (results, done) => {
          // results.request is now the request object:
          done(null, results.third + results.request.params.theInput)
        }]
        // name a method 'reply' to send its output to the handler's 'reply' method:
        reply: ['fourth', (results, done) => {
          const replyString = 'Result was: ' + results.fourth;
          // send the results back to the caller, same as calling 'reply(replyString)':
          done(null, replyString);
        }]
      }
    }
  });
});
```
## Features:

### Special Dependencies
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

### Special Methods
- ***reply***: if a method in the auto map is given the keyname 'reply', then the result will be forwarded to the route handler's __[reply](http://hapijs.com/api#replyerr-result)__ method.
```js
...
  reply: (done) => {
    // this route will always respond with "Hello World!"
    done(null, "Hello World!");
  }
  ...
```
