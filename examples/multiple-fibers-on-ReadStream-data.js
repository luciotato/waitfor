/*
In this example, a fiber is launched for each data chunk, 
on each "on data" event, so "n" tasks are launched in parallel. 

ProcessFile do not "returns" until all fibers complete.

This is a example for parallel fibers & wait.for, 
you should encapsulate the module-level vars and 
all functions in a class before using this in production.

*/

var wait = require('wait.for');
var fs = require('fs');

var tasksLaunched=0;
var finalCallback;
var callbackDone=false;
var dataArr=[]

function callbackOnTimer(ms,sleepCallback) {
  setTimeout(function() {
    return sleepCallback();
  }, ms);
}

function resultReady(err,data){

    if (err){
      callbackDone = true;
      return finalCallback(err);
    }

    dataArr.push(data);
    if (dataArr.length>=tasksLaunched && !callbackDone) {
      callbackDone = true;
      return finalCallback(null,dataArr);
    }
}

function processChunk(data,callback) {
    var ms=Math.floor(Math.random()*1000);
    console.log('waiting',ms);
    wait.for(callbackOnTimer,ms);
    console.log(data.length,"chars");
    return callback(null,data.length);
}

function processFile(filename,callback) {
  var count, onData, onException, onIgnoredEntry;
  count = 0;
  finalCallback = callback;

  onException = function (error) {
    if (!callbackDone){
      callbackDone = true;
      return callback(error);
    }
  };

  onData = function(data) {
    console.log("onData");
    tasksLaunched++;
    wait.launchFiber(processChunk,data,resultReady);
  };

  fs.createReadStream(filename)
    .on('data', onData)
    .on('end', function() {
        console.log("end");
    })
    .on('error', function(error) {
        console.log("error", error);
        if (!callbackDone) {
            callbackDone = true;
            return callback(error);
          }
    });
};

function mainFiber() {
  console.log("Calling processFile");
  var data = wait.for(processFile,'/bin/bash');
  console.log(data.length,"results");
  console.log("processFile returned");
};

//MAIN
wait.launchFiber(mainFiber);
console.log("back in main");

