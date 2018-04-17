#! node
/*
 icat scraper
 Lo Pere, Barcelona. palbcn@yahoo.com
*/

(function ikns() {    
  let superagent = require('superagent');
  require('superagent-charset')(superagent);
  let $ = require('cheerio');

  const ARAFEM_URL = "http://dinamics.ccma.cat/public/apps/catradio/v2/arafem/arafem_ic.json";
 
  // --- extract remote content --------------------
  function loadFromURL(url,cb){
    superagent
      .get(url) 
      .set({"Accept-Encoding" : "gzip,sdch"})   
      .charset()       
      .end(function(err,data){
        if (err) cb(err); else cb(err,data.text);
      });
  };

  // ---- basic functions --------------------------
  function squeeze(s) {
    return s.replace(/\s+/g,' ').trim(); 
  }

  function toTitleCase(s) {
    // TO DO -- recognize Acronyms Z.Z.Z.Z.
    return s.toLowerCase().replace(/^(.)|\s(.)/g, $1 => $1.toUpperCase());
  }

  function ifExists(s) {
    return s ? s: "?"; 
  }

  function adjust(s) {
    return toTitleCase(squeeze(ifExists(s)));
  }

  function abbrev(s,n,ellipsis) {
    let temp = squeeze(ifExists(s));
    if (temp.length <= n || n == 0) return temp;  
    return (ellipsis || '…') + temp.slice(-n);
  };

// -----------------------------------------------  
  function scrape(cb) {
    loadFromURL(ARAFEM_URL, (err,json) => {
      if (err) return cb(err);
      let d = JSON.parse(json);
      if (d && d.canal && d.canal.ara_fem && d.canal.ara_fem.arasona) {
        let song= { 
          id: d.canal.ara_fem.arasona.bloc_id,  
          artist: adjust(d.canal.ara_fem.arasona.interpret), 
          title: adjust(d.canal.ara_fem.arasona.tema), 
          cover: ifExists(d.canal.ara_fem.arasona.imatges.imatge.text),
          timestamp: Date.now()  
        }
        cb(null,song);
      } else {
        cb('unrecognized data',d);
      }       
    });
  }

// --- main --------------------------------------------------------
  if (module.parent) {
    module.exports = scrape;    
  } else {
    (function main(){ 
       function s(){
         scrape(function(e,s){if (!e) console.log(s)});
       }    
       s();                  // now,.. 
       setInterval(s,10000); // ..and every 10 secs  
    })()
  }

})();