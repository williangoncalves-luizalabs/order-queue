var config = require('node-conf').load(process.env.NODE_ENV),
    Promise = require('bluebird'),
    RSMQ = require('rsmq'),
    rsmq = Promise.promisifyAll(new RSMQ({ 
      host: config.redis.host, 
      port: config.redis.port
    })),
    RSMQWorker = require('rsmq-worker'),
    _ = require('lodash'),
    request = Promise.promisifyAll(require("request")),
    Slack = require('node-slack'),
    slack = new Slack(config.slack.hookUrl);

    
var sendMessageToQueue = Promise.method(function sendMessage(msg){    
  return createQueue(config.redis.queue)
    .then(function sendMessage(){
      return rsmq.sendMessageAsync({ message: JSON.stringify(msg), qname: config.redis.queue });
    })
    .then(function getMessageId(messageId){
      return messageId;
    })
    .catch(function (err){
      throw err;
    });
});


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
  var worker = new RSMQWorker(config.redis.queue, {
     autostart: true,
     invisibletime: 2,
     interval: [ .1, 1 ],
     rsmq: rsmq
  });
  
  worker.on('error', function(err, msg){
    console.log("ERROR", err, msg.id);
  });
  
  worker.on('timeout', function(msg){
    console.log("TIMEOUT", msg.id, msg.rc);
  });

  worker.on('exceeded', notifySlack);

  worker.on('message', processMessage);
});

function notifySlack(msg) {
  if((JSON.parse(msg.message).exceedTime || 0) > 0) {
    slack.send({
      text: msg.message,
      channel: '#general',
      username: 'order-queue-bot' 
    });

    rsmq.deleteMessageAsync({ qname: config.redis.queue, id: msg.id })
      .then(function(resp) {
        if(resp == 1) {
          console.log('message deleted: ' + JSON.stringify(msg));
        }
      })
      .catch(function(err){
        throw err;
      });
  } else {
    var message  = JSON.parse(msg.message);
    message.exceedTime  = message.exceedTime ? message.exceedTime + 1 : 1;
    rsmq.sendMessageAsync({ message: JSON.stringify(message), qname: config.redis.queue, delay: config.slack.delay })
      .then(function(resp){
        if(resp == 1) {
          console.log('message reprocessing: ' + JSON.stringify(msg));
        }
      })
      .catch(function(err){
        throw err;
      });
  }
}

function processMessage(message, next, id) {
    var queueMessage = JSON.parse(message);
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
