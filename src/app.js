var express = require('express'), 
    app = express(),
    bodyParser = require('body-parser');
    
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

    
app.use(function(req, res, next) {
  res.header('Content-Type', "application/json");
  res.removeHeader("X-Powered-By");
  next();
});

app.use(require('./routes'));

module.exports = app;
