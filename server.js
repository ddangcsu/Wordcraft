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

// Include mongoose client.  Exposed a Player model.
// Access as var newPlayer = new mClient.Player();
var mClient = require("./modules/mongooseDB");

// Include game dictionary
var dictionary = require("./modules/dictionary");
var dictFile = __dirname + "/assets/gamedict.txt";

// Include the realtime game module
var socketIO = require("./modules/socket");

// Initialize dictionary
dictionary(rClient, dictFile);

// load dictionary
dictionary.load().then(function (result) {
    console.log("Dictionary loaded " + result);
})
.catch(function (err) {
    console.log(err);
    console.log("Program halted");
    process.exit(1);
});

// Include both json and urlencoded form parsers
app.use(parser.json());
app.use(parser.urlencoded({extended: true}));

// Setup route for dictionary check
// Allow API of localhost:port/dict/:word
app.use("/dict", dictionary.checkWord);

// Setup express to serve static file
app.use(express.static(__dirname + "/client/"));

// Setup Express route to allow check if game name is unique
app.get("/checkName/:playerName", function (req, res) {
    console.log("Checking if a player name is unique on " + req.url);
    var playerName;

    if (req.params.playerName) {

        playerName = req.params.playerName.trim();
        mClient.Game.findOne({name: playerName}).select("name").execAsync()
        .then(function (exist) {
            console.log("Result of search " + exist);
            res.json({isUnique: (exist) ? false: true });
        })
        .catch(function (err) {
            console.log(err);
        });
    } else {
        console.log("Missing name to check");
        res.status(400).end("Missing name to check");
    }
});

// Tell IO to attached to the server
socketIO.init(server, mClient, rClient);

// Tell the server to listen on port 3000
server.listen(3000);
console.log("Application is up and running on port 3000");
