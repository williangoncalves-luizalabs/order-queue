var joi = require('joi');
var _ = require('lodash');
var Promise = require('bluebird');

var validateSendMessageRequest = Promise.method(function validateSendMessageRequest(message){
  var schema = joi.object().keys({
    url: joi.string().required(),
    method: joi.string().required().valid([ 'GET', 'get', 'POST', 'post', 'PUT', 'put', 'DELETE', 'delete' ]),
    headers: joi.array().optional(),
    body: joi.object().required()
  });
  
  var vr = joi.validate(message, schema);
  if(vr.error)
    throw new Error(vr.error);
    
  _.assign(message, vr.value);
  
  return message;
});

module.exports = {
  validateSendMessageRequest: validateSendMessageRequest
}