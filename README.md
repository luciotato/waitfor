Wait.for
=======

Wait.for function based on node fibers - wait for future result / promise

Advantages:
* Avoid callback hell / pyramid of doom
* simpler, sequential programming, without blocking node's event loop (thanks to fibers)

Examples:
-

pure node.js:

	fs.readFile('/etc/passwd', function (err, data) {
		if (err) throw err;
		console.log(data);
	});


using Wait.for:

	var Wait=require('waitfor');

	var data = Wait.for(fd.readfile,'/etc/passwd');
	console.log(data);


DNS example
--

pure node.js:

	var sys = require("sys"), dns = require("dns");

	dns.resolve4("google.com", function(err, addresses) {
		if (err) throw err;
		sys.puts("addresses: " + JSON.stringify(addresses));
		for (var i = 0; i < addresses.length; i++) {
			var a = addresses[i];
			dns.reverse(a, function (err, domains) {
				if (err) {
					sys.puts("reverse for " + a + " failed: " + err.message);
				} else {
					sys.puts("reverse for " + a + ": " + JSON.stringify(domains));
				}
    		});
  		}
 	});


using Wait.for:

	var sys = require("sys"), dns = require("dns"), Wait=require('waitfor');
	
	try{
		var addresses = Wait.for(dns.resolve4,"google.com");
		sys.puts("addresses: " + JSON.stringify(addresses));
		for (var i = 0; i < addresses.length; i++) {
			var a = addresses[i];
			var domains = Wait.for(dns.reverse,a);
			sys.puts("reverse for " + a + ": " + JSON.stringify(domains));
   		};
	} 
	catch(e){
		sys.puts("Error: " + e.message);
	};


