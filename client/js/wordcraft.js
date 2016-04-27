// Client-side code
/* jshint browser: true, jquery: true, curly: true, eqeqeq: true, forin: true,
immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double,
undef: true, unused: true, strict: true, trailing: true */
/* global console: true, io: true, ko: true, _: true */
var main = function () {
    "use strict";

    // WordCraft namespace
    var WC = {};

    // WordCraft UI Class Name selector
    WC.UI = {
        chatRoom: $(".chatroom-body"),
        playerList: $(".players-body"),
    };

    // WordCraft Controller function
    WC.Controller = {};

    // WordCraft KO Model
    WC.Model = {};

    // Socket IO information
    var client,
        connected = false;

    // Define a function to create a single KO Player Model
    WC.Model.Player = function (player) {
        return ({
            name: ko.observable(player.name),
            id: ko.observable(player.id),
            self: (client.id === player.id) ? true: false,
        });
    };

    // Define a GameRoom Model that contain an array of observable Player
    WC.Model.GameRoom = {
        // We track a list of players
        players: ko.observableArray(),

        // When we need to add a new player into the room
        // player is an object of name, id
        join: function (player) {
            var self = this;
            self.players.push(new WC.Model.Player(player));
            console.dir(self.players);
        },

        // When we need to delete/remove a player from the room
        // when the player quit the game
        leave: function (player) {
            var self = this;
            self.players.remove(player);
        }

    };

    // Function to greet the server request to join
    WC.Controller.greetServer = function () {
        // Flip the flag to true
        connected = true;
        console.log("Client connected to server");
        console.dir(client);

        // Greet the server to join the server
        var newPayload = {
            type: "greeting",
            from: faker.name.findName(),
            msg: "Hello"
        };
        client.emit("hello", newPayload);
    };

    // Function to display the chat message (need to convert to KO)
    WC.Controller.displayMessage = function (data) {
        var $msg = $("<p>");
        var $chatWindow = WC.UI.chatRoom;

        if (data.type === "greeting") {
            $chatWindow.empty();
        }
        // Mark the message type
        $msg.addClass(data.type + "message");

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
        // Loop through the players to to the Player Join list
        _.each(data.players, function(player) {
            // Check if player already exist.  If yes, ignore it
            var match = ko.utils.arrayFirst(WC.Model.GameRoom.players(), function (p) {
                return p.id() === player.id;
            });

            // Add player to the List if its a new Player
            if (! match) {
                WC.Model.GameRoom.add(player);
            }
        });

        // Then we display the message
        WC.Controller.displayMessage(data);

    };

    // Function to initialize IO connection and setup
    WC.initIO = function () {
        // Initiate SocketIO connection with server
        client = io();

        // Initialize whether the client connected
        client.on("connect", WC.Controller.greetServer);

        // Handle greeting event from server
        client.on("hello", WC.Controller.showMessage);

        // Handle welcome event from server.  Server use this event to
        // notify a new player join the game
        client.on("join game", WC.Controller.playerJoin);

        // Handle disconnect event when the server disconnect the client
        client.on("disconnect", function () {
            connected = false;
            console.log("Client disconnected");
            // Close the connection to prevent continous retry of connection
            client.close();
        });

    };

    // Initialize Socket IO Connection and events handling
    WC.initIO();

    // Apply KnockOut binding
    ko.applyBindings(WC.Model);
};

$(document).ready(main);
