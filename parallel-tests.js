"use strict";
var util = require("util");
var dns = require("dns");
var wait = require("./waitfor");

wait.timeout_callback = function(ms,callback){
    setTimeout(callback,ms); //call callback(null,null) in ms miliseconds
}

wait.miliseconds = function(ms){
    wait.for(wait.timeout_callback,ms);
}

// -------------------
// RUN TESTS (in a Fiber, called from tests.js)
// -------------------
exports.runTests=function(hostname){

    try{

        console.log('--------------------------------');
        console.log('wait.for dns.resolve4 ',hostname);
        var addresses = wait.for(dns.resolve4,hostname);
        console.log("addresses: ",JSON.stringify(addresses));

        //----------------
        //parallel map
        //----------------
        console.log('wait.parallel.map(addresses, dns.reverse)');
        // get reverse addrs in parallel
        // launch a task for each item, calling fn(item,inx,arr)
        var reverseAddrs = wait.parallel.map(addresses, function(item){
            var result="reverse for "+item+" is "+wait.for(dns.reverse,item);
            return result;
        });
        console.log("result reverses:");
        for (var i = 0; i < reverseAddrs.length; i++) {
            console.log(i,reverseAddrs[i]);
        };

        //----------------
        //parallel filter
        //----------------
        console.log('wait.parallel.filter(addresses, likeIt(reverse)');
        // launch a fiber for each item, calling fn(item,inx,arr)
        var reverseLiked = wait.parallel.filter(addresses, function(item,inx){
                
                //random delay
                var ms=Math.floor(Math.random()*1000);
                console.log('waiting',ms, item);
                wait.miliseconds(ms);

                console.log('wait.for dns.reverse',item);
                var reverse = wait.for(dns.reverse,item);

                var likeIt= Math.random()>0.5;
                console.log('item ',inx,item,likeIt?'liked!':'not liked');
                return likeIt;
            });

        console.log("Result: Reverses Liked:");
        for (var i = 0; i < reverseLiked.length; i++) {
            console.log(i,reverseLiked[i]);
        };

    }

    catch(e){
        console.log("Error: " + e.message);
        console.log(e.stack);
    }
};

