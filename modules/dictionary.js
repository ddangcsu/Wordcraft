/* jshint curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true, node: true */
/*
    Module to load the dictionary file into redis
    Required redis, fs, express, bluebird
 */
"use strict";
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var router = require("express").Router();

// Declare redis key to store dictionary for game
// var key = "gamedict";
var client;
var key = "wc.dictionary";
var dictFile;

// Function to initialize the module
var initialize = function (aClient, file) {
    client = aClient;
    dictFile = file;
    console.log("Game Dictionary initializing");
};

// Function to load into redis
var loadDict = function(callback) {

    if (client === undefined && key === undefined) {
        console.log("Error: must run init to pass in redis client and the key to store the dictionary");
        process.exit(1);
    }

    console.log("Loading dictionary file: " + dictFile);

    // Load the dictionary file into redis
    fs.readFileAsync(dictFile).then(function (result) {
        // Built an array out of the words
        var words = result.toString().split("\n");

        // If exist
        client.existsAsync(key).then(function (result) {
            if (result) {
                console.log("Key " + key + " existed");
                console.log("Delete key " + key);
                return client.delAsync(key);
            } else {
                console.log("Key " + key + " not existed");
                return new Promise.resolve(true);
            }

        })
        .then (function () {
            // We load all the words into redis
            console.log("Adding words into redis");
            return client.saddAsync(key, words);
        })
        .then (function (rowCount) {
            console.log("Success load dictionary into " + key);
            callback(null, rowCount, "Success load dictionary");
        })
        .catch (function (err) {
            console.log("Error encountered: " + err);
            callback(err, null, "Error loading dictionary ");
        });
    })
    .catch (function (err) {
        console.log("Error: " + err.stack);
        callback(err, null, "Error loading dictionary");
    });
};

// Function to check the word from redis dictionary
var findWord = function (word, callback) {
    client.sismember(key, word, function (err, result) {
        if (err) {
            console.log("Encountered error checking word " + word);
            callback(err, result, "Error checking dictionary");
        } else {
            callback(err, result, null);
        }
    });
};

// Function to expose the word check Router
router.get("/:word", function (request, response) {
    console.log("Checking word on " + request.url);
    var word;
    // Retrieve the word from link
    if (request.params.word) {
        // Dictionary contains lowercase words.  Convert before check
        word = request.params.word.toLowerCase();
        findWord(word, function (err, result) {
            if (err) {
                console.log("Error checkWord" + err);
                response.status(400).end("Error with check word");
            } else if (result) {
                console.log("Found " + word);
                response.status(200).json({status:true});
            } else {
                console.log("Word <" + word + "> not exist in dictionary");
                response.status(200).json({status:false});
            }
        });
    } else {
        console.log("Missing word to check");
        response.status(400).end("Missing word to check");
    }
});

// Export the function module
module.exports = initialize;
module.exports.load = loadDict;
// Export Express router for this module
module.exports.checkWord = router;
