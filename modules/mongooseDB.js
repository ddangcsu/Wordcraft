/* jshint curly: true, eqeqeq: true, forin: true, immed: true, indent: 4,
latedef: true, newcap: true, nonew: true, quotmark: double, undef: true,
unused: true, strict: true, trailing: true, node: true */
/*
    Use to export the redis client
 */
"use strict";
var Promise = require("bluebird");
var mongoose = Promise.promisifyAll(require("mongoose"));
var dbName = "wordcraft";
var dbUri = "mongodb://localhost/"  + dbName;

// Make connection to Mongodb
mongoose.connect(dbUri);
mongoose.connection.once("open", function () {
    console.log("Database open successfully for DB:" + dbName);
});

// This is our mongoose model for todos
var PlayerSchema = mongoose.Schema({
    name: {
        type: String,
        require: true
    },
    username: {
        type: String,
        unique: true,
        require: true
    },
    password: {
        type: String,
        require: true
    },
    // The following stuff are updated per session that the player play
    socketId: String,
    ready: Boolean,
    done: Boolean,
    wordList: [ String ],
    hiScore: Number,
    currentScore: Number,
    gamePlayed: Number,
});

var Player = mongoose.model("Player", PlayerSchema);


module.exports.Player = Player;
