/* jshint curly: true, eqeqeq: true, forin: true, immed: true,
 indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double,
 undef: true, unused: true, strict: true, trailing: true, node: true */

"use strict";

// var Promise = require("bluebird");

// Create an express application
var express = require("express");
var app = express();

// Create an HTTP server and attached express to it
var server = require("http").createServer(app);
var parser = require("body-parser");

// Include redis client
var rClient = require("./modules/redisDB");

// Include game dictionary
var dictionary = require("./modules/dictionary");
var dictFile = __dirname + "/assets/gamedict.txt";

// Include the realtime game module
var socketIO = require("./modules/realtime");

// Initialize dictionary
dictionary(rClient, dictFile);

// load dictionary
dictionary.load(function (err, count, msg) {
    if (err) {
        console.log("Unable to load " + err);
        console.log("Error message " + msg);
    } else {
        console.log("Dictionary loaded " + count);
    }
});

// Include both json and urlencoded form parsers
app.use(parser.json());
app.use(parser.urlencoded({extended: true}));

// Setup route for dictionary check
// Allow API of localhost:port/dict/:word
app.use("/dict", dictionary.checkWord);

// Setup express to serve static file
app.use(express.static(__dirname + "/client/"));

// Setup Express route
app.get("/test", function (req, res) {
    res.status(200).end("It works");
});

// Tell IO to attached to the server
socketIO.init(server, null, rClient);

// Tell the server to listen on port 3000
server.listen(3000);
console.log("Application is up and running on port 3000");
