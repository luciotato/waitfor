/* node wait.for
 - Sequential programming for node.js
 - Copyright 2013 Lucio Tato
*/

"use strict";
var Fiber = require('fibers');

var Wait = {

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
                                fiber.run();   //resume fiber after "yield"
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

        return Wait.applyAndWait(null,fn,newargs); 
    }

    ,forMethod: function(obj,methodName){ // wait.forMethod(MyObj,'select',....)

        var method=obj[methodName];
        if (!method) throw new Error('wait.forMethod: second argument must be the async method name (string)');
        
        var newargs=Array.prototype.slice.call(arguments,2); // remove obj and method name from args
        return Wait.applyAndWait(obj,method,newargs);
    }
};


module.exports = Wait; //export
