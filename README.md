VERSION 0.5 
--

Wait.for
=======
Simplest abstraction over Fibers.

Take any async function (with callbackFn(err,data) as last parameter) 
and callit in SYNC mode, waiting for results, returning "data" and, if err, throw err.

Advantages:
* Avoid callback hell / pyramid of doom
* Simpler, sequential programming, without blocking node's event loop (thanks to fibers)
* Simpler, try-cath exception programming. if err, throw err, else return data.
* No multithread debugging nightmares, only one fiber running at a given time (thanks to fibers)
* Plays along with node cluster. You design for on thread/processor, then scale with cluster.


TO DO:
--
- support wait.for (object.method, arg...) with the right value for "this"
- ( actualliy this=null for wait.launch and wait.for )

Usage: 
-

   wait.launch(my_seq_function, args...) - launch a new fiber

   wait.for(any_async_function, args,...)  - call async function, wait for result, return data.
   

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
