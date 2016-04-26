/* jshint curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true, node: true */
/*
    Use to export the redis client
 */
"use strict";
var Promise = require("bluebird");
var redis = Promise.promisifyAll(require("redis"));

// Initialize Redis connection
var client = redis.createClient();
// Client connection
// Catch client errors
client.on("error", function (err) {
    console.log("Client ran into an error: " + err);
    process.exit(1);
});

client.on("ready", function (err) {
    if (err) {
        console.log("Could not connect to redis " + err);
        console.log("Exit");
        process.exit(1);
    } else {
        console.log("Redis ready");
    }
});

// Export the client
module.exports = client;
