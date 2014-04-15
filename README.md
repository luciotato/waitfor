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

----------------
####March-2014 - LiteScript

I've ported this functionality to [LiteScript](//github.com/luciotato/LiteScript).

LiteScript is a  higly readable, compile to js language. LiteScript has type annotations, a compile-time validation phase, and catch common js errors and typos in object property names, speeding up development (you code faster) and saving hours of debugging over a mistyped property name. 
[Try LiteScript online](http://luciotato.github.io/LiteScript_online_playground/playground)

Here it is a sample of LiteScript Code, showing "yield until" (wait for async to complete) and "yield parallel" (launch in parallel, wait until all asyncs complete)

#####get google.com IPs, then reverse DNS (in parallel)
    global import dns, nicegen
    nice function resolveAndParallelReverse
        try
            var addresses:array = yield until dns.resolve "google.com"
            var results = yield parallel map addresses dns.reverse 
            for each index,addr in addresses
                print "#{addr} reverse: #{results[index]}"
        catch err
            print "caught:", err.stack
    end nice function

---------------
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

Examples:
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

Generic Usage: 
------------
```javascript
var wait=require('wait.for');

// launch a new fiber
wait.launchFiber(my_seq_function, arg,arg,...)

// fiber
function my_seq_function(arg,arg...){
    // call async_function(arg1), wait for result, return data
    var myObj = wait.for(async_function, arg1); 
    // call myObj.querydata(arg1,arg2), wait for result, return data
    var myObjData = wait.forMethod(myObj,'queryData', arg1, arg2);
    console.log(myObjData.toString());
}
```

Roadmap
--

 * Parallel execution, launch one fiber for each array item, waits until all fibers complete execution.
   * **function wait.parallel.map(arr,fn)** return transformed array;
   * **function wait.parallel.filter(arr,fn)** return filtered array;
   * Status: working prototypes in [paralell-tests.js](http://github.com/luciotato/waitfor/blob/master/paralell-tests.js)
