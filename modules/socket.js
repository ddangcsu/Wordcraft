/* jshint curly: true, eqeqeq: true, forin: true, immed: true,
 indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double,
 undef: true, unused: true, strict: true, trailing: true, node: true */
 "use strict";
// Create an instance of Socket IO server
var io = require("socket.io")();
var _ = require("lodash");

var mongoClient = require("mongodb").MongoClient,
    url = "mongodb://localhost:27017/wordcraft",
    db,
    redisClient;
    
//check if sever is connected
mongoClient.connect(url, function(err, database) {
    if (err) {
        console.log("Could not successfully connect to database.");
    }
    else {
        console.log("Connected correctly to server.");
        db = database;
    }
});

// TODO: We should save the playerList inside a database instead
// Should think about this
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
        // Hello payload contain: type, from, to, msg
        socket.on("hello", function (payload) {
            socket.name = payload.from;
            //TODO: We should save the player information into database
            playerList.push({name: socket.name, id: socket.id});
            
            //Save to database
            db.collection("players").insertOne( {
                    "sid": socket.id,
                    "username": socket.name,
                    //"password": socket.password,
                    "highScore": 0,
                    "gamesPlayed": 0
                }, 
                function(err, result) {
                    if (err) {
                        console.log("Could not save player.");
                    }
                    else {
                        console.log("Inserted a player into the players collection.");
                    }
                }
            );
            
            // Add player to game
            // This may be moved somewhere else if we decide to create groups
            // Can add an if statement to limit the number of players in a game
            db.collection("game").insertOne( {
                    "sid": socket.id,
                    "username": socket.name,
                    "currentScore": 0,
                    "wordList": []
                }, 
                function(err, result) {
                    if (err) {
                        console.log("Could not add player to game.");
                    }
                    else {
                        console.log("Inserted a player into the game collection.");
                    }
                }
            );

            console.log(payload.type + ": <" + socket.name + "> says " + payload.msg);

            // Send a greeting back to client
            var newPayload = {};
            newPayload.type = "greeting";
            newPayload.from = "Server";
            newPayload.to = "";
            newPayload.msg = "Hi " + socket.name +", Welcome to WordCraft game";

            socket.emit("hello", newPayload);
            console.log("Greet user: " + socket.name);

            // Craft a new payload to notify all users that a new player joined
            newPayload = {};
            newPayload.type = "system";
            newPayload.from = "Server";
            newPayload.to = "";
            newPayload.msg = socket.name + " has joined the game";
            io.emit("join game", newPayload);
            console.log(socket.name + " has joined the game");
            // Craft another payload to send just the list of players
            newPayload = {};
            newPayload.players = playerList;
            io.emit("player joined", newPayload);

        });

        // Handle chat message from client
        // Payload contains: type, from, to, msg
        socket.on("send message", function (payload) {
            var newPayload = {};
            if (payload.type === "private") {
                // Deal with private message
                var sendTo = payload.to.id;

                // Craft the payload for client
                newPayload.type = payload.type;
                newPayload.from = "Whisper from";
                newPayload.to = payload.from;
                newPayload.msg = payload.msg;

                console.log("Forward private message to " + sendTo);
                console.log("Payload is: " + newPayload);
                // Send the message privately to the sendTo socket ID
                socket.broadcast.to(sendTo).emit("send message", newPayload);

            } else if (payload.type === "public") {
                // Just forward the payload to others
                console.log("Forward public message");
                socket.broadcast.emit("send message", payload);
            }
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

            // TODO: This removal of players should be from database
            // Get the user that has id match with client.id
            // _.find return an object
            //var player = _.find(playerList, {"id": socket.id} );
            _.remove(playerList, player);
            
            // Delete player from current game
            db.collection("game").deleteOne(
                { "sid": player.id },
                function(err, results) {
                    if (err) {
                        console.log("Delete unsuccessful.");
                    }
                    else {
                        console.log("Player was removed from game.");
                    }
                }
            );

            // Broadcast event player has left
            newPayload.type = "system";
            newPayload.from = "Server";
            newPayload.to = "";
            newPayload.msg = socket.name + " left the game";
            socket.broadcast.emit("leave game", newPayload);

            // Separate message to tell client to update the list of player
            newPayload = {};
            newPayload.players = [player];
            socket.broadcast.emit("player left", newPayload);
            console.dir(playerList);
        });

    });

    console.log("Finished setup the Socket IO server");
};

// Export the module
module.exports.init = initServerIO;
