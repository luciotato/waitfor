/* node wait.for
 - Sequential programming for node.js
 - Copyright 2013 Lucio Tato
*/

var Fiber = require('fibers');

var Wait = {

    launchFiber: function(fn){ // wait.launchFiber(fn,arg1,arg2...)

        if (typeof fn !== 'function') throw new Error('first argument must be a function');
        var newargs=Array.prototype.slice.call(arguments,1); // remove function from args
        Fiber( function(){ fn.apply(null, newargs)} ).run(); //launch new fiber, call the fn with the args, this=null (strict)
    }

    ,for: function(fn){ // wait.for

        if (typeof fn !== 'function') throw new Error('first argument must be an async function');

        var fiber=Fiber.current;
        if (!fiber) throw new Error('Wait.for can only be called inside a fiber');

        //create a closure to resume on callback
        var resumeCallback=function(err,data){
                            fiber.err=err; //store err on fiber object
                            fiber.data=data; //store data on fiber object
                            fiber.run(); //resume fiber
                        };

        var newargs=Array.prototype.slice.call(arguments,1); // remove function from args
        newargs.push(resumeCallback);//add resumeCallback to arguments

        fn.apply(null, newargs); //call async function (this=null)

        Fiber.yield(); //pause fiber, until callback => wait for results

        if (fiber.err) throw fiber.err; //auto throw on error
        return fiber.data; //return data on success
    }

};

module.exports = Wait; //export
