var express = require('express');
var router = express.Router();
var redisClient = require('../helper/redis-queue');
var validations = require('../validations/messages');

function sendMessage(req, res, next){
  var message = req.body;
  
  return validations.validateSendMessageRequest(message)
    .then(function (validateMessage){
      return redisClient.sendMessage(validateMessage);
    })
    .then(function(messageId){
      return res.status(200).send({ id: messageId })
    })
    .catch(function(err){
      return res.status(500).send({ err: err.message || err });
    });
}

router.post('/', sendMessage);

module.exports = router;