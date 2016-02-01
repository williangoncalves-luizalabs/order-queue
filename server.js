var app = require("./src/app"),
    conf = require('node-conf'),
    config = conf.load(process.env.NODE_ENV),
    server = app.listen(config.server.port);
    
console.log("Listening on port " + config.server.port);


//THINGS TO DO
//- LOG
//- DOCUMENTATION
//- TEST