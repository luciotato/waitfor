Wait.for
=======
Sequential programming for node.js, end of callback hell.

Simple, straightforward abstraction over [Fibers](https://github.com/laverdet/node-fibers).

By using **wait.for**, you can call any nodejs standard async function in sequential/Sync mode, waiting for result data, 
without blocking node's event loop (thanks to fibers)

A nodejs standard async function is a function in which the last parameter is a callback: function(err,data)

Advantages:
* Avoid callback hell / pyramid of doom
* Simpler, sequential programming when required, without blocking node's event loop (thanks to fibers)
* Simpler, try-catch exception programming. (default callback handler is: if (err) throw err; else return data)
* You can also launch multiple parallel non-concurrent fibers.
* No multi-threaded debugging nightmares, only one fiber running at a given time (thanks to fibers)
* Can use any node-standard async function with callback(err,data) as last parameter.
* Plays along with node programming style. Write your async functions with callback(err,data), but use them in sequential/SYNC mode when required.
* Plays along with node cluster. You design for one thread/processor, then scale with cluster on multicores.

##NEWS

###Aug-2013 - Wait.for-ES6 based on ES6-generators

I've developed ***a version based on JavaScript upcoming ES6-Harmony generators***. It's not based on node-fibers.
***Surprisingly***, ES6 based implementation of *wait.for(asyncFn)* is almost a no-op, you can even completely omit it. *Warning: Bleeding edge*. Check [Wait.for-ES6] (https://github.com/luciotato/waitfor-ES6) 

---------------


Install: 
----
        npm install wait.for


Proper Use:
----
You need to be in a Fiber to be able to use wait.for. The ideal place to launch a fiber
is when a request arrives, to handle it:

```javascript
var server = http.createServer(
  function(req, res){
    console.log('req!');
    wait.launchFiber(handler,req,res); //handle in a fiber, keep node spinning
  }).listen(8000);
```

then,at *function handler(req,res)* and every function you call from there, 
you'll be able to use wait.for(ayncFn...

Minimal running example
----
```
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
```

Basic Usage Example with Express.js
----
```
var wait = require('wait.for');
var express = require('express');
var app = express();

// in  a Fiber
function handleGet(req, res){
  res.send( wait.for(fs.readFile,'largeFile.html') );
}

app.get('/', function(req,res){
      wait.launchFiber(handleGet, req, res); //handle in a fiber, keep node spinning
});

app.listen(3000);

```

Cradle/couchdb Usage Example
----
see [cradle example](/examples/waitfor-cradle.js)
 
Generic Usage: 
------------
```javascript
var wait=require('wait.for');

// launch a new fiber
wait.launchFiber(my_sequential_function, arg,arg,...)

// in a fiber.. We can wait for async functions
function my_sequential_function(arg,arg...){
    // call async_function(arg1), wait for result, return data
    var myObj = wait.for(async_function, arg1); 
    // call myObj.querydata(arg1,arg2), wait for result, return data
    var myObjData = wait.forMethod(myObj,'queryData', arg1, arg2);
    console.log(myObjData.toString());
}
```

-------------
##Notes on non-standard callbacks. e.g.: connection.query from mysql, database.prepare on node-sqlite3

wait.for expects standardized callbacks. 
A standardized callback always returns (err,data) in that order.

A solution for the sql.query method and other non-standard callbacks 
is to create a wrapper function standardizing the callback, e.g.:

     connection.prototype.q = function(sql, params, stdCallback){ 
                 this.query(sql,params, function(err,rows,columns){ 
                                     return stdCallback(err,{rows:rows,columns:columns}); 
                             });
     }

usage:

    try {
      var result = wait.forMethod(connection, "q", options.sql, options.params); 
      console.log(result.rows);
      console.log(result.columns);
    } 
    catch(err) {
       console.log(err);
    }


e.g.: node-sqlite3's [database.prepare](https://github.com/mapbox/node-sqlite3/wiki/API)

```
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

db.prototype.prep = function(sql, stdCallback){ 
             var stmt = this.prepare(sql, function(err){ 
                                 return stdCallback(err, stmt); 
             });
 }

var stmt = wait.forMethod (db, 'prep', "INSERT OR REPLACE INTO foo (a,b,c) VALUES (?,?,?)");
```


More Examples:
-

DNS testing, *using pure node.js* (a little of callback hell):
```javascript
var dns = require("dns");
    
function test(){ 
	dns.resolve4("google.com", function(err, addresses) {
		if (err) throw err;
		for (var i = 0; i < addresses.length; i++) {
			var a = addresses[i];
			dns.reverse(a, function (err, data) {
				if (err) throw err;
				console.log("reverse for " + a + ": " + JSON.stringify(data));
			});
		};
	});
}

test();
```

***THE SAME CODE***, using **wait.for** (sequential):
```javascript
var dns = require("dns"), wait=require('wait.for');

function test(){
	var addresses = wait.for(dns.resolve4,"google.com");
	for (var i = 0; i < addresses.length; i++) {
		var a = addresses[i];
		console.log("reverse for " + a + ": " + JSON.stringify(wait.for(dns.reverse,a)));
	}
}

wait.launchFiber(test); 
```

Database example (pseudocode)
--
*using pure node.js* (a callback hell):
```javascript
var db = require("some-db-abstraction");

function handleWithdrawal(req,res){  
	try {
		var amount=req.param("amount");
		db.select("* from sessions where session_id=?",req.param("session_id"),function(err,sessiondata) {
			if (err) throw err;
			db.select("* from accounts where user_id=?",sessiondata.user_ID),function(err,accountdata) {
				if (err) throw err;
					if (accountdata.balance < amount) throw new Error('insufficient funds');
					db.execute("withdrawal(?,?)",accountdata.ID,req.param("amount"), function(err,data) {
						if (err) throw err;
						res.write("withdrawal OK, amount: "+ req.param("amount"));
						db.select("balance from accounts where account_id=?", accountdata.ID,function(err,balance) {
							if (err) throw err;
							res.end("your current balance is "  + balance.amount);
						});
    				});
				});
			});
		}
		catch(err) {
			res.end("Withdrawal error: "  + err.message);
	}
}
```
Note: The above code, although it looks like it will catch the exceptions, **it will not**. 
Catching exceptions with callback hell adds a lot of pain, and i'm not sure if you will have the 'res' parameter 
to respond to the user. If somebody like to fix this example... be my guest.


***THE SAME CODE***, using **wait.for** (sequential logic - sequential programming):
```javascript
var db = require("some-db-abstraction"), wait=require('wait.for');

function handleWithdrawal(req,res){  
	try {
		var amount=req.param("amount");
		sessiondata = wait.forMethod(db,"select","* from session where session_id=?",req.param("session_id"));
		accountdata = wait.forMethod(db,"select","* from accounts where user_id=?",sessiondata.user_ID);
		if (accountdata.balance < amount) throw new Error('insufficient funds');
		wait.forMethod(db,"execute","withdrawal(?,?)",accountdata.ID,req.param("amount"));
		res.write("withdrawal OK, amount: "+ req.param("amount"));
		balance = wait.forMethod(db,"select","balance from accounts where account_id=?", accountdata.ID);
		res.end("your current balance is "  + balance.amount);
		}
	catch(err) {
		res.end("Withdrawal error: "  + err.message);
}  
```

Note: Exceptions will be catched as expected.
db methods (db.select, db.execute) will be called with this=db


-------------

##How does wait.launchFiber works?

`wait.launchFiber(genFn,param1,param2)` starts executing the `function genFn` *as a fiber-generator* until a "yield" (wait.for) is found, then `wait.launchFiber` execute the "yielded" value (a call to an async function), and links generator's "next" with the async callback(err,data), so when the async finishes and the callback is called, the fiber/generator "continues" after the `var x =wait.for(...)`.


Parallel Extensions
----------

-------------
###wait.parallel.launch(functions:Array)
     
Note: must be in a Fiber

####input: 
* functions: Array = [[func,arg,arg],[func,arg,arg],...]

wait.parallel.launch expects an array of [[func,arg,arg..],[func,arg,arg..],...] and then launches a fiber for each function call, in parallel, and waits for all the fibers to complete.

The functions to be called ***should not be async functions***. 

Each called sync function will be executed in it's own fiber, and this sync function should/can use `data=wait.for(..)` internally in order to call async functions.

####actions:
-launchs a fiber for each func
-the fiber does `resultArray[index] = func.apply(undefined,args)`

####returns:
- array with a result for each function
- do not "returns" until all fibers complete
- throws if error


-------------
###wait.parallel.map(arr:Array, mappedFn:function)
     
Note: must be in a Fiber

####input: 
- arr: Array
- mappedFn = function(item,index,arr) 
-- mappedFn should return converted item. Since we're in a fiber
-- mappedFn can use wait.for and also throw/try/catch
        
####returns:
- array with converted items
- do not "returns" until all fibers complete
- throws if error

-------------
###wait.parallel.filter(arr:Array, itemTestFn:function)

Note: must be in a Fiber

####input: 
- arr: Array
- itemTestFn = function(item,index,arr) 
-- itemTestFn should return true|false. Since we're in a fiber
-- itemTestFn can use wait.for and also throw/try/catch

####returns 
- array with items where itemTestFn() returned true
- do not "returns" until all fibers complete
- throws if error


-------------
Parallel Usage Example: 
see: 
- [parallel-tests](/parallel-tests.js)
