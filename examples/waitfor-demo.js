var fs = require('fs');
var http = require('http');
var wait = require('./waitfor');

//------------------------------
// TEST APP - dummy blog server
//------------------------------

function formatPost(post){
  var lines=post.split('\n');
  var result = '<h1>'+lines[0]+'</h1>'
              + '<h2>'+lines[1]+'</h2>';
  for(var i=2;i<lines.length;i++)
      result +='<p>'+lines[i]+'</p>';
  
  return result;
}

function composeTemplate(css, template){
  var composed=template.replace('{{ css }}', css);
  return composed;
}

function applyTemplate(template, content){
  return template.replace('{{ content }}', content);
}

function longAsyncFn(inputData,callback){

  var data = 'here it is: '+inputData;
  var err = Math.random()>0.8? new Error('The ocassional error, Math.random()>0.8') : null;
  
  //simulate a long operation
  setTimeout( function() {
      callback(err,data)}
      ,2000);
}

//handle request in a fiber
function handler(req,res){  
    try{
      res.writeHead(200, {'Content-Type': 'text/html'});
      var start = new Date().getTime();
      //console.log(start);

      //read css, wait.for syntax:
      var css = wait.for(fs.readFile,'style.css','utf8');

      //read post, fancy syntax:
      var content = wait.for(fs.readFile,'blogPost.txt','utf8');

      //compose  template, fancy syntax, as parameter:
      var template = composeTemplate ( css, wait.for(fs.readFile,'blogTemplate.html','utf8') );

      console.log('about to call hardToGetData...');

      //call async, wait.for syntax, in a expression
      var hardToGetData = "\n" + start.toString().substr(-5) +"<br>" + ( wait.for(longAsyncFn,'some data') );

      console.log('hardToGetData=',hardToGetData);
      
      var end = new Date().getTime();

      hardToGetData += ', after '+(end-start)+' ms<br>';
      hardToGetData += end.toString().substr(-5);

      res.end( applyTemplate(template, formatPost ( content + hardToGetData) ) );

    }
    catch(err){
      res.end('ERROR: '+err.message);
    }
  }

//----------------
// Main

var server = http.createServer(
  function(req, res){
    console.log('req!');
    wait.launchFiber(handler,req,res); //handle in a fiber
    // keep node spinning
  }).listen(8000);
  
console.log('server started on port', 8000);
