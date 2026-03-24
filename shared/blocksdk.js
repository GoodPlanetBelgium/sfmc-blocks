/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 * Source: https://github.com/salesforce-marketingcloud/blocksdk (archived Jan 2024)
 * Vendored to avoid CDN dependency and ensure long-term stability.
 */

var SDK = function (config, whitelistOverride, sslOverride) {
  if (Array.isArray(config)) {
    whitelistOverride = config;
    sslOverride = whitelistOverride;
    config = undefined;
  }

  if (config && config.onEditClose) {
    this.handlers = {
      onEditClose: config.onEditClose
    };
    config.onEditClose = true;
  }

  this._whitelistOverride = whitelistOverride;
  this._sslOverride = sslOverride;
  this._messageId = 1;
  this._messages = {
    0: function () {}
  };
  this._readyToPost = false;
  this._pendingMessages = [];
  this._receiveMessage = this._receiveMessage.bind(this);

  window.addEventListener('message', this._receiveMessage, false);

  window.parent.postMessage({
    method: 'handShake',
    origin: window.location.origin,
    payload: config
  }, '*');
};

SDK.prototype.execute = function execute (method, options) {
  options = options || {};
  var self = this;
  var payload = options.data;
  var callback = options.success;

  if (!this._readyToPost) {
    this._pendingMessages.push({
      method: method,
      payload: payload,
      callback: callback
    });
  } else {
    this._post({ method: method, payload: payload }, callback);
  }
};

SDK.prototype.getCentralData = function (cb) { this.execute('getCentralData', { success: cb }); };
SDK.prototype.getContent    = function (cb) { this.execute('getContent',     { success: cb }); };
SDK.prototype.getData       = function (cb) { this.execute('getData',        { success: cb }); };
SDK.prototype.getUserData   = function (cb) { this.execute('getUserData',    { success: cb }); };
SDK.prototype.getView       = function (cb) { this.execute('getView',        { success: cb }); };

SDK.prototype.setBlockEditorWidth = function (value, cb) { this.execute('setBlockEditorWidth', { data: value, success: cb }); };
SDK.prototype.setCentralData      = function (dataObj, cb) { this.execute('setCentralData', { data: dataObj, success: cb }); };
SDK.prototype.setContent          = function (content, cb) { this.execute('setContent',     { data: content, success: cb }); };
SDK.prototype.setData             = function (dataObj, cb) { this.execute('setData',        { data: dataObj, success: cb }); };
SDK.prototype.setSuperContent     = function (content, cb) { this.execute('setSuperContent',{ data: content, success: cb }); };

SDK.prototype._executePendingMessages = function () {
  var self = this;
  this._pendingMessages.forEach(function (msg) {
    self.execute(msg.method, { data: msg.payload, success: msg.callback });
  });
  this._pendingMessages = [];
};

SDK.prototype._post = function (payload, callback) {
  this._messages[this._messageId] = callback;
  payload.id = this._messageId;
  this._messageId += 1;
  window.parent.postMessage(payload, this._parentOrigin);
};

SDK.prototype._receiveMessage = function (message) {
  message = message || {};
  var data = message.data || {};

  if (data.method === 'handShake') {
    if (this._validateOrigin(data.origin)) {
      this._parentOrigin = data.origin;
      this._readyToPost = true;
      this._executePendingMessages();
      return;
    }
  } else if (data.method === 'closeBlock') {
    if (this._validateOrigin(data.origin)) {
      if (this.handlers && this.handlers.onEditClose) {
        this.handlers.onEditClose();
      }
      this.execute('blockReadyToClose');
      return;
    }
  }

  if (!this._parentOrigin || this._parentOrigin !== message.origin) { return; }
  (this._messages[data.id || 0] || function () {})(data.payload);
  delete this._messages[data.id];
};

SDK.prototype._validateOrigin = function (origin) {
  var allowedDomains = this._whitelistOverride || [
    'exacttarget\\.com',
    'marketingcloudapps\\.com',
    'blocktester\\.herokuapp\\.com'
  ];

  for (var i = 0; i < allowedDomains.length; i++) {
    var optionalSsl  = this._sslOverride ? '?' : '';
    var mcSubdomain  = allowedDomains[i] === 'exacttarget\\.com' ? 'mc\\.' : '';
    var regex = new RegExp(
      '^https' + optionalSsl + '://' + mcSubdomain +
      '([a-zA-Z0-9-]+\\.)*' + allowedDomains[i] + '(:[0-9]+)?$', 'i'
    );
    if (regex.test(origin)) { return true; }
  }
  return false;
};

if (typeof window === 'object') {
  window.sfdc = window.sfdc || {};
  window.sfdc.BlockSDK = SDK;
}

module.exports = SDK;
