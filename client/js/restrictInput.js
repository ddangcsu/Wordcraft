// file to resctrict input 
var main = function () {
    "use strict";
    
    $('#wordBox').keypress(function(e){
          console.log("here");
        if(String.fromCharCode(e.char.toUpperCase().charCode) === WC.Model.GameLetters.letters[0].e
        || String.fromCharCode(e.char.toUpperCase().charCode) === WC.Model.GameLetters.letters[1].e
        || String.fromCharCode(e.char.toUpperCase().charCode) === WC.Model.GameLetters.letters[2].e
        || String.fromCharCode(e.char.toUpperCase().charCode) === WC.Model.GameLetters.letters[3].e
        || String.fromCharCode(e.char.toUpperCase().charCode) === WC.Model.GameLetters.letters[4].e
        || String.fromCharCode(e.char.toUpperCase().charCode) === WC.Model.GameLetters.letters[5].e
        || String.fromCharCode(e.char.toUpperCase().charCode) === WC.Model.GameLetters.letters[6].e
        || String.fromCharCode(e.char.toUpperCase().charCode) === WC.Model.GameLetters.letters[7].e ){
        } 
        else {
          return false;
        }
    });
};

$(document).ready(main);