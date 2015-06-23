//
// this example illustrates how to use wait.for with cradle and couchdb to
// execute synchronous calls to cradle.  this example is for illustrative
// purposes only because it requires an equivalent couchdb database.
//
// the couchdb database is named "notes" containing technical notes in
// various areas (e.g., couchdb, json, etc).  The db includes:
//      1.  four user docs with information associated with
//          a technical area (e.g.,"title", "date created", "content")
//      2.  one design doc containing views for the four user docs
//
var wait = require('wait.for');

//
// define a cradle fiber for executing the following cradle functions
// in a synchronous manner:
//  1. creating a cradle connection to couchdb (which is already 
//     synchronous)
//  2. checking if the db exists (<cradle>.exist)
//  2. querying views of docs in the db (<cradle>.view)
//
function cradleFiber() {
    var cradle = require('cradle');
    var cdbServer = 'http://rb-macmini2.local'; // default: 127.0.0.1
    var cdbPort = 5984;                         // default: 5984
    var dbName = 'notes';
    var dbExist = false;

    // get the db
    var theDB = new(cradle.Connection)(cdbServer,cdbPort).database(dbName);
    var results;
    // db exist
    console.log('calling theDB.exists');
    dbExist=wait.forMethod(theDB,"exists");
    if (dbExist) {
        console.log('database exists');
    } else {
        console.log('database does not exist');
        return;
    }
    // view titles
    console.log('calling theDB.view');
    results=wait.forMethod(theDB,"view","view_notes/view_titles");
    results.forEach(function(row) {
        console.log('Title: %s', row);
    });
    // view content info
    console.log('calling theDB.view');
    results=wait.forMethod(theDB,"view","view_notes/view_content_info");
    results.forEach(function (key,row){
        console.log('Title: %s Content.filename: %s',key,row.filename);
        console.log('Title: %s Content.filedir: %s',key,row.filedir);
    });
    // view info
    console.log('calling theDB.view');
    results=wait.forMethod(theDB,"view","view_notes/view_info");
    results.forEach(function (key,row){
        console.log('Title: %s Info.os: %s',key,row.os);
        console.log('Title: %s Info.technology: %s',key,row.technology);
        console.log('Title: %s Info.author: %s',key,row.author);
        console.log('Title: %s Info.date: %s',key,row.date);
    });
}

//launch main fiber
wait.launchFiber(cradleFiber);
console.log('cradle fiber launched');

