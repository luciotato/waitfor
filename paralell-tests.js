"use strict";
var util = require("util");
var dns = require("dns");
var wait = require("./waitfor");

wait.parallel={};
wait.helper={};

wait.helper.timeout_callback = function(ms,callback){
    setTimeout(callback,ms); //call callback(null,null) in ms miliseconds
}

wait.miliseconds = function(ms){
    wait.for(wait.helper.timeout_callback,ms);
}

wait.helper.fiberForItem = function(asyncItemFn,item,inx,result,callback){
    var ms=Math.floor(Math.random()*1000);
    console.log('fiber',inx,'waiting',ms);
    wait.miliseconds(ms);
    console.log('fiber',inx,'calling asyncItemFn',item);
    asyncItemFn(item
        ,function(err,data){
            if (err) callback(err,null);
            console.log('arrived result',inx,data);
            result.arr[inx]=data;
            result.count++;
            if (result.count>=result.expected) { // all results arrived
                callback(null,result.arr) ; // final callback
            }
        }
    );
}

wait.parallel.async_map = function(arr,asyncItemFn,callback){
    //
    // asyncItemFn = function(item,index,arr,callback)
    //
    var result={arr:[],count:0,expected:arr.length};
    if (result.expected===0) return result.arr;

    for (var i = 0; i < arr.length; i++) {
        wait.launchFiber(wait.helper.fiberForItem
            ,asyncItemFn,arr[i],i,result,callback);
    };

}

wait.parallel.map = function(arr,asyncItemFn){
    //
    // asyncItemFn = function(item,callback) - callback(err,data) return data=item transformed
    //
    // must be in a Fiber
    //
    return wait.for(wait.parallel.async_map, arr, asyncItemFn);
}

wait.parallel.filter = function(arr,asyncItemTestFn){
    //
    // asyncItemFn = function(item,callback) - callback(err,data) return data=true/false
    //
    // must be in a Fiber
    //
    var testResults = wait.parallel.map(arr,asyncItemTestFn);

    // create an array for each item where asyncItemTestFn returned true
    var filteredArr=[];
    for (var i = 0; i < arr.length; i++) 
        if (testResults[i]) filteredArr.push(arr[i]);

    return filteredArr;
}



// ----------------------
// DNS TESTS -------------
// ----------------------

function showReverse(addr,i){
    var ms=Math.floor(Math.random()*1000);
    console.log('waiting',ms);
    wait.miliseconds(ms);
    console.log("reverse for",i, addr , ":", JSON.stringify(wait.for(dns.reverse,addr)));
}

function sequential_resolve_parallel_reverse(hostname){

    console.log('dns.resolve4 ',hostname);
    var addresses = wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    for (var i = 0; i < addresses.length; i++) {
        wait.launchFiber(showReverse, addresses[i],i);
    };
}


function sequential_resolve(hostname){

    console.log('dns.resolve4 ',hostname);
    var addresses = wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    for (var i = 0; i < addresses.length; i++) {
        showReverse(addresses[i],i);
    };

}

// ----------------------
// OBJECT TESTS ---------
// ----------------------
function Answer(value,pong){
    this.value = value;
    this.pong = pong;
}

Answer.prototype.think=function(callback){
  if (!this) {
    var errMsg='ERR: this is null, at: Answer.prototype.think';
    console.log(errMsg);
    callback(new Error(errMsg));
  } 
  else {
    console.log('thinking...(but not blocking)');
    wait.miliseconds(500);
    callback(null, 'the answer is: '+this.value);
  }
};

Answer.prototype.pingPong=function(ping,callback){
    // callback before return
    callback(null, ping+'...'+this.pong);
}


var theAnswer = new Answer(42,'tomeito');
var theWrongAnswer = new Answer('a thousand','tomatito');


// -------------------
// RUN TESTS (Fiber)--
// -------------------
function runTests(hostname){

    console.log('--------------------------------');
    console.log('wait.for dns.resolve4 ',hostname);
    var addresses = wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    // get reverse addrs in parallel
    console.log('wait.parallel.map(addresses, dns.reverse)');
    console.log('-with random waits-');
    var reverseAddrs = wait.parallel.map(addresses, dns.reverse);
    console.log("reverses:");
    for (var i = 0; i < reverseAddrs.length; i++) {
        console.log(i,reverseAddrs[i]);
    };

    console.log('wait.parallel.filter(addresses, likeIt(reverse)');
    var reverseLiked = wait.parallel.filter(addresses, function(item,callback){
            console.log('wait.for dns.reverse',item);
            var reverse = wait.for(dns.reverse,item);
            var likeIt= Math.random()>0.5;
            if (likeIt) console.log('I like ',item);
            callback(null, likeIt);
        });
    console.log("Reverses Liked:");
    for (var i = 0; i < reverseLiked.length; i++) {
        console.log(i,reverseLiked[i]);
    };

    console.log('--------------------------------');
    console.log('resolve, then sequential reverse (wait for each)');
    sequential_resolve(hostname);
    console.log('--------------------------------');

    console.log('--------------------------------');
    console.log('resolve, then parallel reverse (no wait)');
    sequential_resolve_parallel_reverse(hostname);
    console.log('--------------------------------');

    //METHOD TEST (passing 'this' to the function)
    console.log(wait.forMethod(theAnswer,'think'));
    console.log(wait.forMethod(theAnswer,'pingPong','tomato'));

    console.log(wait.forMethod(theWrongAnswer,'think'));
    console.log(wait.forMethod(theWrongAnswer,'pingPong','pera'));

}

// MAIN
try{
    wait.launchFiber(runTests,"google.com");
} 
catch(e){
    console.log("Error: " + e.message);
};

