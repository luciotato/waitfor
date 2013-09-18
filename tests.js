"use strict";
var util = require("util");
var dns = require("dns");
var wait = require("./waitfor");


// ----------------------
// DNS TESTS -------------
// ----------------------

function showReverse(addr){
    console.log("reverse for " + addr + ": " + JSON.stringify(wait.for(dns.reverse,addr)));
}

function sequential_resolve_parallel_reverse(hostname){

    console.log(dns.resolve4);
    console.log('dns.resolve4 ',hostname);
    var addresses = wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    for (var i = 0; i < addresses.length; i++) {
        wait.launchFiber(showReverse, addresses[i]);
    };
}


function sequential_resolve(hostname){

    console.log('dns.resolve4 ',hostname);
    var addresses = wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    for (var i = 0; i < addresses.length; i++) {
        showReverse(addresses[i]);
    };

}

// ----------------------
// OBJECT TESTS ---------
// ----------------------
function Constructor(value,pong){
    this.value = value;
    this.pong = pong;
}

Constructor.prototype.think=function(callback){
  if (!this) {
    var errMsg='ERR: this is null, at: Constructor.prototype.think';
    console.log(errMsg);
    callback(new Error(errMsg));
  } 
  else {
    console.log('thinking...');
    var self=this;
    // callback after 1.5 secs
    setTimeout(function(){
        callback(null, 'the answer is: '+self.value)}
        ,1500);
  }
};

Constructor.prototype.pingPong=function(ping,callback){
    // callback before return
    callback(null, ping+'...'+this.pong);
}


var theAnswer = new Constructor(42,'tomeito');
var theWrongAnswer = new Constructor('a thousand','tomatito');


// -------------------
// test callback called more than one time
// -------------------
function callItTwice(callback){
    setTimeout(callback,200);
    setTimeout(callback,300);
    setTimeout(callback,400);
    setTimeout(callback,500);
};

// -------------------
// RUN TESTS (Fiber)--
// -------------------
function runTests(hostname){

    console.log('--------------------------------');
    console.log('resolve, then sequential reverse');
    sequential_resolve(hostname);
    console.log('--------------------------------');

    console.log('--------------------------------');
    console.log('resolve, then parallel reverse');
    sequential_resolve_parallel_reverse(hostname);
    console.log('--------------------------------');

    //METHOD TEST (passing 'this' to the function)
    console.log(wait.forMethod(theAnswer,'think'));
    console.log(wait.forMethod(theWrongAnswer,'think'));
    
    console.log(wait.forMethod(theAnswer,'pingPong','tomato'));
    console.log(wait.forMethod(theWrongAnswer,'pingPong','pera'));

    wait.for(callItTwice);
    /*
    }
    catch(e){
    }
    */
    console.log('end of tests');
}

// MAIN
process.on('uncaughtException', function(e) {
    if (e.message.indexOf('called twice')!=-1) console.log('OK: wait.for(callItTwice) throw an expected error')
        else console.log(e);
});

try{
    wait.launchFiber(runTests,"google.com");
    console.log('after wait.launchFiber');
} 
catch(e){
    console.log('catched!');
    console.log(e);
};

