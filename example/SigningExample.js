#!/usr/bin/env node
//npm install express body-parser and navigate to http://127.0.0.1:8080/index.html
var express = require('express');
var bodyParser = require('body-parser');
var crypto = require('crypto');

var app = express();
app.use(express.static(require('path').join( __dirname + '/../')));

// Add simple logging middleware
app.use(function(req, res, next) {
  console.log(req.method + ' ' + req.originalUrl);
  next();
});

app.use(bodyParser.urlencoded({
	extended: true
}));

app.listen(8080, '127.0.0.1', function () {
	console.log('Listening on 127.0.0.1:8080');
});

app.use('/sign_auth', function (req, res) {
	// TOD