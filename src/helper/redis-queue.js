var conf = require('node-conf'),
    config = conf.load(process.env.NODE_ENV),
    Promise = require('bluebird'),
    RSMQ = require('rsmq'),
    rsmq = Promise.promisifyAll(new RSMQ({ 
      host: config.redis.host, 
      port: config.redis.port
    })),
    RSMQWorker = require('rsmq-worker'),
    validQueues = config.redis.queues,
    _ = require('lodash'),
    request = Promise.promisifyAll(require("request"));
    
var sendMessageToQueue = Promise.method(function sendMessage(msg, queue){
  if(!isValidQueue(queue))
    throw new Error('This is not a valid queue');
    
  return createQueue(queue)
    .then(function sendMessage(){
      return rsmq.sendMessageAsync({ message: JSON.stringify(msg), qname: queue });
    })
    .then(function getMessageId(messageId){
      return messageId;
    })
    .catch(function (err){
      throw err;
    });
});

function isValidQueue(queue) {
  return _.some(validQueues, function(validQueue){
    return queue === validQueue;
  });
}

var createQueue = Promise.method(function createQueue(queueName){
  return rsmq.listQueuesAsync().then(function (createdQueues){
    var alreadyCreated = _.some(createdQueues, function(createdQueue) {
      return queueName === createdQueue;
    });
    
    if(!alreadyCreated)
      return rsmq.createQueueAsync({ qname: queueName })
        .then(function(resp) {
          return;
        })
        .catch(function(err){
          throw err;
        });
    else {
      return;
    }
  });
});

var initializeWorkers = Promise.method(function initializeWorkers() {
    _.each(validQueues, function (queueToListen){
        var worker = new RSMQWorker(queueToListen,{
           autostart: true,
           invisibletime: 2,
           interval: [ .1, 1 ],
           rsmq: rsmq
        });
        
        worker.on('error', function( err, msg ){
                console.log( "ERROR", err, msg.id );
        });
        
        worker.on('timeout', function( msg ){
            console.log( "TIMEOUT", msg.id, msg.rc );
        });
        
        worker.on('message', processMessage);
    });
});

function processMessage(message, next, id) {
    var queueMessage = JSON.parse(message);
    console.log(queueMessage);
    var options = {
      url: queueMessage.url,
      method: queueMessage.method,
      strictSSL: true
    };
    
    request.getAsync(options)
        .then(function(response){
            if(response.statusCode == 200) {
                next(true);
            } else {
                next(false);
            }
        })
        .catch(function(err){
            next(false); 
        });
}

module.exports = {
  sendMessage: sendMessageToQueue,
  initializeWorkers: initializeWorkers
}
