#! node
/*
 record the play history of icat 
 Lo Pere, Barcelona. palbcn@yahoo.com
*/

const fs=require('fs');
const path=require('path');
const os=require('os');
const scraper = require('./icatscraper');

const express = require('express');

let played=[];  // previously played songs list
let playing={}; // currently playing song

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

  let icatfn = path.normalize(path.resolve(
    process.argv[2] || 
    process.env.ICAT || 
    path.join(os.homedir(),'icat.json')));

  if (!fs.existsSync(icatfn)) return console.error(icatfn+' not found');
  
  let data = fs.readFileSync(icatfn, "utf-8")
  if (!data) return console.error("can't read "+icatfn);
  let parsed=JSON.parse(data);
  if (!Array.isArray(parsed)) return console.error('invalid '+icatfn);  
  let played = parsed;
  played.sort( (a,b)=> a.timestamp-b.timestamp );  
  played = played.filter( (e,i) => (i==0)||(e.artist!=played[i-1].artist)||(e.title!=played[i-1].title));
  
  console.log('Recording play history of icat.cat into ',YELLOW+
  icatfn,WHITE+played.length+RESET,'songs');
 
  played.forEach( s => saySong(s) );    
  
  (function nowAndEveryNsecs(func){
    const Nsecs=30;      // every 30 seconds
    func();                       // now..
    setInterval(func,Nsecs*1000); // ..and every N secs, invoke..
  }) ( function () {              // ..this function
    scraper(function(err,song) {
      if (err) return console.error(err); 
      let lastplayed = played[played.length-1];
      if ( !lastplayed || (lastplayed.id!=song.id) && // if not already inserted 
          (song.artist!=="?") &&     // only if valid song, not a news clip
          (song.title.toLowerCase().indexOf("icat ")!=0) ) {  // and not an ad does not begin with icat
        saySong(song);
        played.push(song);          // insert at last position 
        fs.writeFileSync(icatfn, JSON.stringify(played), "utf-8"); // save to disk
      }       
    });
  }, 30); 
  
  let app = express(); 
  let started = Date.now();
  let hostname = os.hostname();  
  let serverfn = process.argv[1];  
  
  app.use(express.static(path.join(__dirname, 'public'), 
    {index: 'icathistoryviewer.html'}));
  app.get('/info', function (req, res) {
    res.send({ serverfn, icatfn, hostname, started });
  }); 
  app.get('/history', function (req, res) {
    res.send(played);
  });  
  let port = process.env.PORT || 32104;
  let server = app.listen(port, function () {
    process.stdout.write(`
iCat history server ${YELLOW}${serverfn}${RESET} 
is now ${CYAN}${ymdhm(started)}${RESET} open for e-business
at ${YELLOW}${hostname}:${server.address().port}${RESET}
`   );


/*
  recommended startup, add to crontab  
       @reboot NODE_ENV=production; /usr/local/bin/node /home/pi/icat/icathistory >> /home/pi/icat.log &
  
  and then...
       tail /home/pi/icat.log -f

*/

  if (app.get('env') =='development') {
      let browserSync = require('browser-sync');
      browserSync.init({
        proxy:"localhost:"+port,
        browser: "chrome",
        files: ["public/*"]
      });
    }    
  });  
  
})()
