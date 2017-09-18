#! node

var superagent = require('superagent');

function inarray(val,arr) {
  return arr.indexOf(val)!=-1;
}

function onelevel(obj) {
  var ret= {};
  for(var prop in obj) {
    if (obj.hasOwnProperty(prop) && inarray(typeof obj[prop],["boolean","number","string"])) {
      ret[prop]=obj[prop];  
    }
  }
  return ret;
}

superagent
 .get(process.argv[2]) 
 .set({"Accept-Encoding" : "gzip,sdch"})    
 .end(function(err,data){
    if (err) console.log(err.response.request.method+' '+err.response.request.url,err.status); 
    else console.dir(data.text);
   });

    


