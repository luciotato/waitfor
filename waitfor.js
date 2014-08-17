/* node wait.for
 - Sequential programming for node.js
 - Copyright 2013 Lucio Tato
*/

"use strict";
var Fiber = require('fibers');

var wait = {

    launchFiber: function(fn){ // wait.launchFiber(fn,arg1,arg2...)

        if (typeof fn !== 'function') throw new Error('first argument must be a function');
        var newargs=Array.prototype.slice.call(arguments,1); // remove function from args
        Fiber( function(){ fn.apply(null, newargs)} ).run(); //launch new fiber, call the fn with the args, this=null (strict)
    }

    ,applyAndWait: function(thisValue,fn,args){ // like js fn.apply, but wait for results

        var fiber=Fiber.current;
        if (!fiber) throw new Error('wait.for can only be called inside a fiber');

        var fnName = fn.name;

        //create a closure to resume on callback
        var resumeCallback=function(err,data){
                            if (fiber.callbackAlreadyCalled)
                                 throw new Error("Callback for function "+fnName+" called twice. Wait.for already resumed the execution.");
                            fiber.callbackAlreadyCalled = true;
                            fiber.err=err; //store err on fiber object
                            fiber.data=data; //store data on fiber object
                            if (!fiber.yielded) {//when callback is called *before* async function returns
                                // no need to "resume" because we never got the chance to "yield"
                                return;
                            }
                            else {
                                //resume fiber after "yield"
                                fiber.run();   
                            }
                        };

        args.push(resumeCallback);//add resumeCallback to arguments

        fiber.callbackAlreadyCalled=false;
        fiber.yielded = false;
        fn.apply(thisValue, args); //call async function/method
        if (!fiber.callbackAlreadyCalled) { //except callback was called before async fn return
            fiber.yielded = true;
            Fiber.yield(); //pause fiber, until callback => wait for results
        }

        if (fiber.err) throw fiber.err; //auto throw on error
        return fiber.data; //return data on success
    }

    ,for: function(fn){ // wait.for(fn,arg1,arg2,...)

        if (typeof fn !== 'function') throw new Error('wait.for: first argument must be an async function');

        var newargs=Array.prototype.slice.call(arguments,1); // remove function from args

        return wait.applyAndWait(null,fn,newargs); 
    }

    ,forMethod: function(obj,methodName){ // wait.forMethod(MyObj,'select',....)

        var method=obj[methodName];
        if (!method) throw new Error('wait.forMethod: second argument must be the async method name (string)');
        
        var newargs=Array.prototype.slice.call(arguments,2); // remove obj and method name from args
        return wait.applyAndWait(obj,method,newargs);
    }

};

//parallel extensions
/*
Main Functions:

wait.parallel.launch = function(functions)
----------------------
     
     Note: must be in a Fiber
    
     input: 
        functions: Array = [func,arg,arg],[func,arg,arg],...
        
        it launch a fiber for each func
        the fiber do: resultArray[index] = func.apply(undefined,args)
        
     returns array with a result for each function
     do not "returns" until all fibers complete

     throws if error


wait.parallel.map = function(arr,mappedFn)
----------------------
     
     Note: must be in a Fiber
    
     input: 
        arr: Array
        mappedFn = function(item,index,arr) 
        
            mappedFn should return converted item. Since we're in a fiber
            mappedFn can use wait.for and also throw/try/catch
        

     returns array with converted items
     do not "returns" until all fibers complete

     throws if error


wait.parallel.filter = function(arr, itemTestFn)
----------------------

     Note: must be in a Fiber
    
     input: 
        arr: Array
        itemTestFn = function(item,index,arr) 
        
            itemTestFn should return true|false. Since we're in a fiber
            itemTestFn can use wait.for and also throw/try/catch
        
     returns array with items where itemTestFn() returned true
     do not "returns" until all fibers complete

     throws if error

*/


wait.parallel = {};

wait.parallel.taskJoiner=function(inx,context,err,data){
    
        if (context.finished) return;

        context.count++;
        //console.log('arrived result',inx,err,data,"result.count",context.count,"task",context.taskId);
    
        if (err) {
            context.finished = true;
            return context.finalCallback(err); //err in one of the fibers
        }
        else 
            context.results[inx]=data;

        if (context.count>=context.expected) { // all contexts arrived
            //console.log("finall callback. elements:",context.count);
            context.finished = true;
            return context.finalCallback(null,context.results) ; // final callback
        }
};

wait.parallel.fiberForItemBody = function(inx,context,functionAndArgs){
    //console.log('fiber',inx,'calling mappedFunction',args);
    try{
        var data = functionAndArgs[0].apply(undefined,functionAndArgs.slice(1));
        wait.parallel.taskJoiner(inx,context,null,data);
    }
    catch(err){
        wait.parallel.taskJoiner(inx,context,err);
    }
};


wait.parallel.async_launch = function(functions,finalCallback){
    //
    // functions:Array = [function,arg,arg..],[function,arg,arg,...],...
    // call finalCallback array with results of each func, a fiber is launched for each item
    // finalCallback is called when all functions complete
    //
    var context={results:[],count:0, expected:functions.length, finished:false, finalCallback:finalCallback};
    if (context.expected===0) return finalCallback(null,context.results);

    //launch a fiber for each item, 
    // each item is an array containing function ptr and arguments
    for (var i = 0; i < functions.length; i++) {
        wait.launchFiber(wait.parallel.fiberForItemBody,i,context,functions[i]);
    };
};

wait.parallel.launch = function(functions){
    //
    // functions = [function,arg,arg],[function,arg,arg],...
    // returns array with results of each func, a fiber is launched for each item
    // wait.parallel.returns when all functions complete
    //
    return wait.for(wait.parallel.async_launch, functions);
};

wait.parallel.map = function(arr,mappedFn){
    // must be in a Fiber
    //
    // mappedFn = function(item,index,arr) returns converted item, a fiber is launched for each item
    //
    // convert arr into an array of functions + parameters
    var functions = arr.map(function(item,inx){return [mappedFn,item,inx,arr]});
    // launch a fiber for each item. wait until all fibers complete
    return wait.parallel.launch(functions);
}

wait.parallel.filter = function(arr,itemTestFn){
    // must be in a Fiber
    //
    // mappedFn = function(item,index,arr) returns true/false
    //
    var testResults = wait.parallel.map(arr,itemTestFn);

    // create an array for each item where itemTestFn returned true
    var filteredArr=[];
    for (var i = 0; i < arr.length; i++) 
        if (testResults[i]) filteredArr.push(arr[i]);

    return filteredArr;
}

module.exports = wait; //export
