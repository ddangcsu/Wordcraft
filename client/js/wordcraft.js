// Client-side code
/* jshint browser: true, jquery: true, curly: true, eqeqeq: true, forin: true,
immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double,
undef: true, unused: true, strict: true, trailing: true */
/* global console: true, io: true, ko: true, _: true */
var main = function () {
    "use strict";

    // WordCraft namespace
    var WC = {
        // Define the User Interface jQuery selector for each DOM section
        UI: {
            chatRoom: $(".chatroom-body"),
            playerList: $(".players-body"),
        },
        // Define holder for Controller functions
        Controller: {},

        // Define holder for KO View Model
        Model: {}
    };

    // Socket IO information
    var client,
        connected = false;

    // Define a function to create a single KO Player Model
    WC.Model.Player = function (player) {
        // The client.id does not contain the prefix /# like the one from
        // the server replied
        console.log("Client id:" + "/#" + client.id);
        console.log("Player id:" + player.id);
        return {
            name: player.name,
            id: player.id,
            self: ("/#" + client.id === player.id) ? true: false,
        };
    };

    // Define a GameRoom Model that contain an array of observable Players
    WC.Model.GameRoom = {
        // We track a list of players
        players: ko.observableArray(),

        // When we need to add a new player into the room
        // player is an object of name, id
        add: function (player) {
            var self = this;
            self.players.push(new WC.Model.Player(player));
        },
        // Function to update the Game Room with a list of players
        update: function (players) {
            var self = this;
            // Compute to get only new players the server sent
            var diff = _.differenceBy(players, self.players(), "id");
            // Loop through the players to to the Player Join list
            _.each(diff, function(player) {
                self.add(player);
            });
        },
        // When we need to delete/remove a player from the room
        // when the player quit the game
        remove: function (player) {
            var self = this;
            self.players.remove(function (p) {
                return p.id === player.id;
            });
        }
    };

    // Define a function to model a chat message
    WC.Model.Message = function (msg) {
        return {
            type: msg.type + "-msg",
            from: function () {
                var formatFrom = "";
                if (msg.type === "private") {
                    formatFrom = "Whisper from " + msg.from;
                } else {
                    formatFrom = msg.from;
                }
                return formatFrom;
            },
            text: msg.msg,
        };
    };

    // Define a ChatRoom Model that contain an array of observable messages
    WC.Model.ChatRoom = {
        msgInput: ko.observable(),
        messages: ko.observableArray(),

        // Function to add a message into the messages array
        add: function (msg) {
            var self = this;
            self.messages.push(new WC.Model.Message(msg));
        },

        // Send chat method
        send: function () {
            var self = this;
            if (self.msgInput() !== "") {
                
            }
        },

        // option to clear the chat room windows
        clear: function () {
            var self = this;
            self.messages([]);
        }
    };

    // Function to greet the server request to join
    WC.Controller.greetServer = function () {
        // Flip the flag to true
        connected = true;
        console.log("Client connected to server");
        console.dir(client);
        client.name = "player" + Date.now();

        // Greet the server to join the server
        var newPayload = {
            type: "greeting",
            from: client.name,
            msg: "Hello"
        };
        client.emit("hello", newPayload);

        // Add self so that it show up as first player on the list
        WC.Model.GameRoom.add({name: newPayload.from, id: "/#" + client.id});
    };

    // Function to display the chat message (need to convert to KO)
    WC.Controller.displayMessage = function (data) {
        var $msg = $("<p>");
        var $chatWindow = WC.UI.chatRoom;

        if (data.type === "greeting") {
            $chatWindow.empty();
        }
        // Mark the message type
        $msg.addClass(data.type + "-msg");

        // Add the message text
        $msg.text(data.from + ": " + data.msg);

        $chatWindow.append($msg);
        // Auto scroll the Chat DIV to the bottom
        $chatWindow.scrollTop($chatWindow.get(0).scrollHeight);
    };

    // Function to handle player join a game
    // When a Player Join, need to update the Player List and also display
    // The server broadcast message
    WC.Controller.playerJoin = function (data) {
        // Tell Model to update itself with the list of players
        WC.Model.GameRoom.update(data.players);

        // Then we display the message
        WC.Controller.displayMessage(data);

    };

    // Function to handle when a player leave the game
    // Need to update the Player List to remove player and also display
    // The server broadcast message.  Payload for players should be a single
    // player that left the game
    WC.Controller.playerLeft = function (data) {
        // Remove the player from playerList
        _.each(data.players, function(player) {
            WC.Model.GameRoom.remove(player);
        });

        // Then display the message
        WC.Controller.displayMessage(data);
    };

    // Function to initialize IO connection and setup
    WC.initIO = function () {
        // Initiate SocketIO connection with server
        client = io();

        // Initialize whether the client connected
        client.on("connect", WC.Controller.greetServer);

        // Handle greeting event from server
        client.on("hello", WC.Controller.displayMessage);

        // Handle welcome event from server.  Server use this event to
        // notify a new player join the game
        client.on("join game", WC.Controller.playerJoin);

        // Handle welcome event from server.  Server use this event to
        // notify a new player join the game
        client.on("left game", WC.Controller.playerLeft);

        // Handle disconnect event when the server disconnect the client
        client.on("disconnect", function () {
            connected = false;
            console.log("Client disconnected");
            // Close the connection to prevent continous retry of connection
            client.close();
        });

    };

    // Apply KnockOut binding
    ko.applyBindings(WC.Model);

    // Initialize Socket IO Connection and events handling
    WC.initIO();


};

$(document).ready(main);
