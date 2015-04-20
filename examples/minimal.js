var wait = require('wait.for');

function anyStandardAsync(param, callback){
    setTimeout( function(){
                  callback(null,'hi '+param);
        }, 5000);
};

function  testFunction(){
    console.log('fiber start');
    var result = wait.for(anyStandardAsync,'test');
    console.log('function returned:', result);
    console.log('fiber end');
};

console.log('app start');
wait.launchFiber(testFunction);
console.log('after launch');
