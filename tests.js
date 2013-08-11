var dns = require("dns");
var wait = require("./waitfor");

function showReverse(addr){
    console.log("reverse for " + addr + ": " + JSON.stringify(wait.for(dns.reverse,addr)));
}

function sequential_resolve_parallel_reverse(hostname){
    var addresses = Wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    for (var i = 0; i < addresses.length; i++) {
        wait.launchFiber(showReverse, addresses[i]);
    };
}


function sequential_resolve(hostname){

    var addresses = wait.for(dns.resolve4,hostname);
    console.log("addresses: ",JSON.stringify(addresses));
    for (var i = 0; i < addresses.length; i++) {
        showReverse(addresses[i]);
    };

}

function runTests(hostname){

    console.log('--------------------------------');
    console.log('resolve, then sequential reverse');
    sequential_resolve(hostname);
    console.log('--------------------------------');

    console.log('--------------------------------');
    console.log('resolve, then parallel reverse');
    sequential_resolve_parallel_reverse(hostname);
    console.log('--------------------------------');

}

// MAIN
try{
    Wait.launchFiber(runTests,"google.com");
} 
catch(e){
    console.log("Error: " + e.message);
};

