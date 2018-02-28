#! node
/*
 record play history of icat 
 Lo Pere, Barcelona. palbcn@yahoo.com
*/

let fs=require('fs');
let path=require('path');
let os=require('os');
var scraper = require('./icatscraper');

var played=[]  // previously played songs list
var playing={} // currently playing song
var icatfn = 'icathistory.json'; 

// --- date time format --------------------------------------------
function ymdhm(ts) {
  let z = v => v < 10 ? "0" + v : v;
  let date = new Date(ts);
  let year = date.getFullYear();
  let month = z(date.getMonth() + 1);
  let day = z(date.getDate());
  let hour = z(date.getHours());
  let minute = z(date.getMinutes());
  return "" + year + month + day + " " + hour + minute;
}

// --- colors ------------------------------------------------------
function esc(v) { return "\x1b["+v+"m" };
const RESET=esc(0);
/* Foreground colors. 30:Black,31:Red,32:Green,33:Yellow,34:Blue,35:Magenta,36:Cyan,37:White */
const BLACK=esc(30); 
const RED=esc(31); 
const GREEN=esc(32);
const YELLOW=esc(33);
const BLUE=esc(34);
const MAGENTA=esc(35);
const CYAN=esc(36);
const WHITE=esc(37);


// --- main --------------------------------------------------------

(function main(){  
  function saySong(s) {
    let dt = ymdhm(s.timestamp);
    process.stdout.write(dt+' '+WHITE+s.artist+RESET+' - '+CYAN+s.title+RESET+'\n')
  }

  icatfn = path.normalize(path.resolve(
    process.argv[2] || 
    process.env.ICAT || 
    path.join(os.homedir(),'icathistory.json')));

  if (!fs.existsSync(icatfn)) return console.error(icatfn+' not found');
  
  let data = fs.readFileSync(icatfn, "utf-8")
  if (!data) return console.error("can't read "+icatfn);
  let parsed=JSON.parse(data);
  if (!Array.isArray(parsed)) return console.error('invalid '+icatfn);  
  let played = parsed;
  played.sort( (a,b)=> a.timestamp-b.timestamp );  
  played = played.filter( (e,i) => (i==0)||(e.artist!=played[i-1].artist)||(e.title!=played[i-1].title));
  
  console.log('Recording play history of icat.cat into ',CYAN+
  icatfn,WHITE+played.length+RESET,'songs'); 
  
  played.forEach( s => saySong(s) );    
  
  (function nowAndEvery10secs(func){
    func();                  // now...
    setInterval(func,10000); // ..and every 10secs, invoke..
  }) ( function () {         // this function
    scraper(function(err,song) {
      if (err) return;    
      if ( !played[0] || (played[0].id!=song.id) && // if not already inserted 
          (song.artist!=="?") &&     // only if valid song, not a news clip
          (song.title.toLowerCase().indexOf("icat ")!=0) ) {  // and not an ad does not begin with icat
        saySong(song);
        played.unshift(song);          // insert at first position 
        fs.writeFileSync(icatfn, JSON.stringify(played), "utf-8"); // save to disk
      }       
    });
  });    
})()
