var express = require('express'), 
    app = express(),
    bodyParser = require('body-parser'),
    redisQueue = require('./helper/redis-queue');


// logger.init();
redisQueue.initializeWorkers();

app.use(require('express-bunyan-logger').errorLogger());
app.use(require('express-bunyan-logger')({
  name: 'logger', 
  streams: [{
    level: 'info',
    stream: process.stdout
  }]
}));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(require('swagger-express').init(app, {
	apiVersion: '1.0',
	swaggerVersion: '2.0',
	swaggerURL: '/swagger',
	swaggerJSON: '/api-docs.json',
	swaggerUI: './documentation/public/swagger/',
	basePath: 'http://localhost:3000',
	info: {
	  title: 'documentation from process queue API',
	},
	apis: ['./documentation/api.js'],
	middleware: function(req, res){}
}));

    
app.use(function(req, res, next) {
  res.header('Content-Type', "application/json");
  res.removeHeader("X-Powered-By");
  next();
});

app.use(require('./routes'));

module.exports = app;
