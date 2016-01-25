var conf = require('node-conf'),
    config = conf.load(process.env.NODE_ENV),
    Promise = require('bluebird'),
    RSMQ = require('rsmq'),
    rsmq = Promise.promisifyAll(new RSMQ({ 
      host: config.redis.host, 
      port: config.redis.port
    })),
    RMSQWorker = require('rsmq-worker'),
    validQueues = config.redis.queues,
    _ = require('lodash');
    
var sendMessageToQueue = Promise.method(function sendMessage(msg, queue){
  if(!isValidQueue(queue))
    throw new Error('This is not a valid queue');
    
  return createQueue(queue)
    .then(function (){
      return rsmq.sendMessageAsync({ message: JSON.stringify(msg), qname: queue });
    })
    .then(function(messageId){
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
  var worker  = new RMSQWorker(queue, {
    rsmq: rsmq,
    
  });
});

module.exports = {
  sendMessage: sendMessageToQueue,
  initializeWorkers: initializeWorkers
}
