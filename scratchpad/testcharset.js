#! node

var superagent = require('superagent')
require('superagent-charset')(superagent)


const ARAFEM_URL = "http://dinamics.ccma.cat/public/apps/catradio/v2/arafem/arafem_ic.json";
 
// --- extract remote content -------------------------------------------
function loadFromURL(url,cb){
  superagent
    .get(url) 
    .set({"Accept-Encoding" : "gzip,sdch"})  
    .charset()    // honor whatever charset is in the content-type header	
    .end(function(err,data){
      if (err) cb(err); else cb(err,data.text);
    });
};

function logerror(err) {
  console.error(err.response
    ?err.response.request.method+' '+err.response.request.url+' '+err.status
    :err); 
}

loadFromURL(ARAFEM_URL, (err,json) => {
    if (err) return logerror(err);
    var d = JSON.parse(json);
    console.log(d.canal.ara_fem.titol_programa);
  }); 

