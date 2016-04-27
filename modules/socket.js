/* jshint curly: true, eqeqeq: true, forin: true, immed: true,
 indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double,
 undef: true, unused: true, strict: true, trailing: true, node: true */
 "use strict";
// Create an instance of Socket IO server
var io = require("socket.io")();
var _ = require("lodash");

var mongoClient,
    redisClient;

var playerList = [];

var initServerIO = function (server, mongo, redis) {
    console.log("Initialize the Socket IO server");

    // Attached socket IO to HTTP server
    io.attach(server);

    // Save a reference of the mongo and redis client
    // Incase we need to save data
    mongoClient = mongo;
    redisClient = redis;

    // Listen for client connection when a client connect a new socket
    // is created for that client
    io.on("connection", function (socket) {
        console.log("A client has been connected", socket.id);
        //console.log("Total connected clients: " + _.size(io.sockets.connected));

        // Handle greeting from client
        // Hello payload contain: type, from, msg
        socket.on("hello", function (payload) {
            socket.name = payload.from;
            playerList.push({name: socket.name, id: socket.id});

            console.log(payload.type + ": <" + socket.name + "> says " + payload.msg);

            // Send a greeting back to client
            var newPayload = {};
            newPayload.type = "greeting";
            newPayload.from = "Server";
            newPayload.msg = "Hi " + socket.name +", Welcome to WordCraft game";

            socket.emit("hello", newPayload);
            console.log("Greet user: " + socket.name);

            // Craft a new payload to notify all users that a new player joined
            newPayload = {};
            newPayload.type = "system";
            newPayload.from = "Server";
            newPayload.players = playerList;
            newPayload.msg = socket.name + " has joined the game";
            io.emit("join game", newPayload);
            console.log(socket.name + " has joined the game");

        });

        // Show when a client disconnected
        socket.on("disconnect", function () {
            console.log("A client has disconnected " + socket.id);
            //console.log("Total connected clients: " + _.size(io.sockets.connected));
            var newPayload = {};
            var player = {
                name: socket.name,
                id: socket.id
            };
            // Get the user that has id match with client.id
            // _.find return an object
            //var player = _.find(playerList, {"id": socket.id} );
            _.remove(playerList, player);

            // Broadcast event player has left
            newPayload.type = "system";
            newPayload.from = "Server";
            newPayload.players = [player];
            newPayload.msg = socket.name + " left the game";
            socket.broadcast.emit("left game", newPayload);
            console.dir(playerList);
        });

    });

    console.log("Finished setup the Socket IO server");
};

// Export the module
module.exports.init = initServerIO;
