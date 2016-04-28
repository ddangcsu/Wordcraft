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
var loadDict = function() {
    // This function will return a Promise
    return new Promise(function (resolve, reject) {
        if (client === undefined || dictFile === undefined) {
            reject(new Error("dictionary not initialized"));
        }

        // Check if Redis key
        client.existsAsync(key).then(function (exist) {
            if (exist) {
                console.log("Key " + key + " existed");
                console.log("Delete key " + key);
                // Delete it
                return client.delAsync(key);
            } else {
                console.log("Key " + key + " not existed");
                // Just return the next promise
                return Promise.resolve(true);
            }
        })
        .then(function () {
            // We read file
            console.log("Reading file ...");
            console.log("path: " + dictFile);
            return fs.readFileAsync(dictFile);
        })
        .then (function (fileContent) {
            // Turn the file content into an array of words
            // split by the new line
            var words = fileContent.toString().split("\n");
            // We load all the words into redis
            console.log("Adding words into redis");
            return client.saddAsync(key, words);
        })
        .then (function (rowCount) {
            // now if load is called, its then will get rowCount
            resolve(rowCount);
        })
        .catch(function (err) {
            // Error
            reject(err);
        });

    });
};

// Function to check the word from redis dictionary
var findWord = function (word) {
    // Return a promise
    return new Promise (function (resolve, reject) {
        client.sismemberAsync(key, word)
        .then(function (searchResult) {
            // Redis result will be 1 if found or 0 if not
            // Change it to true or false
            resolve((searchResult)? true: false);
        })
        .catch(function (err) {
            reject(err);
        });
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
        findWord(word).then(function (result) {
            if (result) {
                console.log("Found " + word);
            } else {
                console.log("Word <" + word + "> not exist in dictionary");
            }
            // Response the json and convert result from 0 and 1
            // to true and false
            response.json({valid: (result) ? true : false});
        })
        .catch(function (err) {
            console.log(err);
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
