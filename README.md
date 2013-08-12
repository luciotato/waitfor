VERSION 0.5 
--

Wait.for
=======
Simplest abstraction over Fibers.

Take any nodejs standard async function (with callback(err,data) as last parameter) 
and callit in SYNC mode, waiting for results, returning "data" and, throwing on error.

Advantages:
* Avoid callback hell / pyramid of doom
* Simpler, sequential programming when required, without blocking node's event loop (thanks to fibers)
* Simpler, try-cath exception programming. (default callback handler is: if (err) throw err; else return data)
* You can also launch multiple parallel non-concurrent fibers.
* No multithread debugging nightmares, only one fiber running at a given time (thanks to fibers)
* Can use any node-standard async libs and functions with callback(err,data) as last parameter.
* Plays along with node programming style, you continue designing your async functions with callback(err,data), but you can use them in sequetial mode when required.
* Plays along with node cluster. You design for on thread/processor, then scale with cluster on multicores.


TO DO:
--
- support wait.for (object.method, arg...) passing this=*object*
- ( actualliy this=null for wait.launch and wait.for )

Usage: 
-

	var wait=require('waitfor');
	
	// launch a new fiber
	wait.launch(my_seq_function, arg,arg,...) 

	function my_seq_function(arg,arg...){
	    // call async function, wait for result, return data
	    var result1 = wait.for(any_async_function, args,...); 
	    // call another async function, wait for result, return data
   	    var result2 = wait.for(another_async_function, result1, args,...);
	}
	
	
Examples:
-

pure node.js:

	fs.readFile('/etc/passwd', function (err, data) {
		if (err) throw err;
		console.log(data);
	});


using Wait.for:

	var wait=require('waitfor');
	console.log(wait.for(fd.readfile,'/etc/passwd'));


What if... Fibers and WaitFor where part of node core?
-
then you can deprecate almost half the functions at: http://nodejs.org/api/fs.html
(a clue: the *Sync* versions)


Database example (pseudocode)
--
pure node.js:

	function handleWithdrawal(req,res){  
		try {
			var amount=req.param("amount");
			db.select("* from user where username=?",req.param("user"),function(err,userdata) {
				if (err) throw err;
				db.select("* from accounts where user_id=?",userdata.user_ID),function(err,accountdata) {
					if (err) throw err;
    					if (accountdata.balance < amount) throw new Err('insufficient funds');
    					db.execute("withdrawal(?,?),accountdata.ID,req.param("amount"), function(err,data) {
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

Note: The above code, although it looks like will catch the exceptions, **it will not**. 
Catching exceptions with callback hell adds a lot of pain, and i'm not sure if you will have the 'res' parameter 
to respond to the user. If somebody like to fix this example... be my guest.


using wait.for:

	function handleWithdrawal(req,res){  
		try {
			var amount=req.param("amount");
			userdata = wait.for(db.select("* from user where username=?",req.param("user")));
			accountdata= wait.for(db.select("* from accounts where user_id=?",userdata.user_ID));
			if (accountdata.balance < amount) throw new Err('insufficient funds');
			wait.for(db.execute("withdrawal(?,?),accountdata.ID,req.param("amount")));
			res.write("withdrawal OK, amount: "+ req.param("amount"));
			balance=wait.for(db.select("balance from accounts where account_id=?", accountdata.ID));
			res.end("your current balance is "  + balance.amount);
    		}
    		catch(err) {
    			res.end("Withdrawal error: "  + err.message);
		}  


Note: Exceptions will be catched as expeceted.

DNS example
--

pure node.js:

	var dns = require("dns");

	dns.resolve4("google.com", function(err, data) {
		if (err) throw err;
		console.log("addresses: " + JSON.stringify(data));
		for (var i = 0; i < addresses.length; i++) {
			var a = addresses[i];
			dns.reverse(a, function (err, data) {
				if (err) throw err;
				console.log("reverse for " + a + ": " + JSON.stringify(data));
				});
    		};
 	});


using Wait.for:

	var dns = require("dns"), wait=require('waitfor');
	
	var addresses = wait.for(dns.resolve4,"google.com");
	console.log("addresses: " + JSON.stringify(addresses));
	for (var i = 0; i < addresses.length; i++) {
		var a = addresses[i];
		console.log("reverse for " + a + ": " + JSON.stringify(wait.for(dns.reverse,a)));
   	};


see tests.js for more examples.
