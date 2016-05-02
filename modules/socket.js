/* jshint curly: true, eqeqeq: true, forin: true, immed: true,
 indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double,
 undef: true, unused: true, strict: true, trailing: true, node: true */
 "use strict";
// Create an instance of Socket IO server
var Promise = require("bluebird");
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
var readyCount = 0;

// Private function to emit an ioEvent with a count down seconds
var countDownTimer = function (ioEvent, seconds) {
    // Return a promise to do things when the countdown completed
    return new Promise(function (resolve) {
        var timer = seconds;
        var countdown = setInterval(function () {
            // the ioEvent i.e. countdown
            io.emit(ioEvent, {"timer": timer});
            console.log(ioEvent + " : " + timer);
            timer--;
            if (timer === -1) {
                clearInterval(countdown);
                resolve(true);
            }
        }, 1000);
    });
};

// Private function to send up the letters
var sendLetters = function (ioEvent) {
    //TODO: as for now, randomly output 10 letters
    var vowels = "AEIOU";
    var consonants = "BCDFGHJKLMNPQRSTVWXYZ";

    var random = _.sampleSize(vowels,2).join("") + _.sampleSize(consonants,6).join("");
    var letters = _.shuffle(random.split(""));

    // Return a promise to do things when send Letters completed
    return new Promise(function (resolve) {
        io.emit(ioEvent, letters);
        resolve(true);
    });
};

// Private function to generate a list of letters

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

        /*
            This section below is to handle all the games events
        */
        // Handle ready event from players
        socket.on("ready", function (payload) {
            //TODO:  Code to handle ready events.  This event is use from a
            // client chat window to indicated that he's ready.  Upon received
            // server marked the user as ready
            console.log("A Player is ready");
            // Just relay the payload message
            socket.broadcast.emit("ready", payload);
            //TODO:  These two value should come from the result of a DB query
            // in order to determine the total players and the total ready

            // Set both to 0 for now to test the ready count down
            var userCount = playerList.length;
            readyCount += 1;

            console.log("Total players: " + userCount);
            console.log("Total ready: " + readyCount);

            // TODO: This is the code to send the seconds to countdown.  If
            // we want larger countdown value, change the seconds value
            // Then the server will emit the count down if all are ready
            if (userCount === readyCount) {
                var ioEvent = "countdown";
                var seconds = 5;
                console.log("Start count down ...");
                countDownTimer(ioEvent, seconds)
                .then(function () {
                    console.log("Then this");
                    readyCount = 0;
                    console.log("Reset readyCount to 0");
                    console.log("Send up the letters");
                    var ioEvent = "game started";
                    return sendLetters(ioEvent);
                })
                .then(function () {
                    console.log("Letters sent to players");
                    var ioEvent = "game timer";
                    var gameTime= 20;
                    return countDownTimer(ioEvent, gameTime);
                })
                .then(function () {
                    console.log("Game finished");
                });

            }

        });

    });

    console.log("Finished setup the Socket IO server");
};

// Export the module
module.exports.init = initServerIO;
