/* jshint curly: true, eqeqeq: true, forin: true, immed: true,
 indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double,
 undef: true, unused: true, strict: true, trailing: true, node: true */

"use strict";
var http = require("http");
var express = require("express");
var parser = require("body-parser");
var io = require("socket.io")(); // Create an instance of Socket IO server

// Initialize express
var app = express();

// Create HTTP Server and attached express to it
var server = http.createServer(app);

// Attach socket io to the server
io.attach(server);

// Include both json and urlencoded form parsers
app.use(parser.json());
app.use(parser.urlencoded({extended: true}));

// Setup express to serve static file
app.use(express.static(__dirname + "/client/"));

// Setup Express route
app.get("/test", function (req, res) {
    res.status(200).end("It works");
});

// Tell the server to listen on port 3000
server.listen(3000);
console.log("Application is up and running on port 3000");
