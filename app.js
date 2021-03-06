#! node
/*
 icat directe Server
 Lo Pere, Barcelona. palbcn@yahoo.com
*/

const fs=require('fs')
const path=require('path')
const os=require('os')
const superagent = require('superagent')
require('superagent-charset')(superagent)
const $ = require('cheerio')
const express = require('express');
const sharp = require('sharp');
const datauris = require('datauris'); 
    
let app = express();

const ARAFEM_URL = "http://dinamics.ccma.cat/public/apps/catradio/v2/arafem/arafem_ic.json";
const BLANKIMAGE = "noimage.jpg";
 
let played=[]  // previously played songs list
let playing={} // currently playing song
let icatfn = 'icat.json'; 

let favorites=[]
let favsfn = 'favorites.json'

// --- played list utils  ----------------------------------------------
function findSongInList(song,list) {
  for (let i=0,l=list.length; i<l; i++) {
    if ((list[i].title==song.title)&&(list[i].artist==song.artist)) {
      return i;
    }
  }
  return -1;
}

function findIdInList(id,list) {
  for (let i=0,l=list.length; i<l; i++) {
    if (list[i].timestamp==id) {
      return i;
    }
  }
  return -1;
}

// ---------------------------------------------
app.use(express.static(__dirname + '/public'));

// ---------------------------------------------
// vendor libraries and common assets 
// - in development they are in two well known global locations:
//   vendor should be outside the backed up filesets, assets should be not.
// - in production assets are deployed in public 
// - and vendor should not be needded as resources should be loaded from provider cdns
if (app.get('env') =='development') {
  app.use('/vendor',express.static(path.join(process.env.APPDATA,'vendor')));
} else {
  app.use('/vendor',express.static(__dirname + '/client/vendor'));
}

// --- express routes --------------------------------------------------
app.get('/played', function (req, res) {
  res.send(played);
}); 

app.get('/playing', function (req, res) {
  res.send(playing);
}); 

app.get('/favorites', function (req, res) {
  res.send(favorites);
})

app.delete('/played/:id',function(req,res) {
  console.time('delete '+req.params.id);
  let index=findIdInList(req.params.id,played);
  if (index==-1) {
    res.status(404).send(req.params.id+" not found");
  } else {
    played.splice(index,1);
    res.send(played);
    fs.writeFileSync(icatfn, JSON.stringify(played), "utf-8")
  }  
  console.timeEnd('delete '+req.params.id)
})

app.post('/like/:id', function (req, res) {
  let index=findIdInList(req.params.id,played)
  if (index==-1) { 
    console("404 "+req.params.id+" not found");
    return res.status(404).send(req.params.id+" not found");
  } 
  console.time('like '+req.params.id)
 
  played[index].like = !played[index].like;
  let reqsong = {
    artist: played[index].artist,
    title: played[index].title
  }

  index=findSongInList(reqsong,favorites)
  if (index==-1) { 
    reqsong.like=true
    favorites.push(reqsong)
  } else {
    favorites[index].like=!favorites[index].like
  }
  res.send(favorites)
  fs.writeFileSync(favsfn, JSON.stringify(favorites), "utf-8")
  console.timeEnd('like '+req.params.id)
})


// --- extract remote content -------------------------------------------
function loadFromURL(url,cb){
  superagent
    .get(url) 
    .set({"Accept-Encoding" : "gzip,sdch"})   
    .charset()       
    .end(function(err,data){
      if (err) cb(err); else cb(err,data.text);
    });
};

function logerror(err) {
  if (err)
    console.error(err.response
    ?err.response.request.method+' '+err.response.request.url+' '+err.status
    :err); 
}

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
  if (!s) return "?";
  return toTitleCase(squeeze(s));  
}

function abbrev(s,n,ellipsis) {
  let temp = squeeze(ifExists(s));
  if (temp.length <= n || n == 0) return temp;  
  return (ellipsis || '…') + temp.slice(-n);
};

// -----------------------------------------------
function repeatChar(c,n) {
  let r = '';
  for (let i=0; i<n; i++) r+=c;
  return r;
}

function isImage(s) {
  return s && s.match(/\.(jpeg|jpg|gif|png)$/)
}

function asImage(s) {
  return isImage(s) ? s : BLANKIMAGE;
}

// -----------------------------------------------
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

function colorLog(c,s) {
  process.stdout.write(c + s + RESET + '\n');
}

// -----------------------------------------------
let lastID=0;

function scrape() {
  loadFromURL(ARAFEM_URL, (err,json) => {
    if (err) return logerror(err);
    let d = JSON.parse(json);
    if (d.canal && d.canal.ara_fem && d.canal.ara_fem.arasona &&
        (d.canal.ara_fem.arasona.bloc_id != lastID)) {
      let song= { 
        id: d.canal.ara_fem.arasona.bloc_id,  
        artist: adjust(d.canal.ara_fem.arasona.interpret), 
        title: adjust(d.canal.ara_fem.arasona.tema), 
        cover: asImage(d.canal.ara_fem.arasona.imatges.imatge.text),
        timestamp: Date.now()  
      };
      playing=song;         // show as currently played
      let idx=findSongInList(song,played); 
      song.like = (idx==-1) ? false : played[idx].like;  
      let t = Math.floor(Date.now()/1000);
      let tstl = (t+' '+song.artist+' - '+song.title).length;
      let tsts = t+' '+WHITE+song.artist+' - '+CYAN+song.title+RESET;
      process.stdout.write(tsts+repeatChar(' ',79-tstl)+'\r'); 
      // insert in played list
      if ( (played[0].id!=song.id) &&  // if not already inserted 
           (song.artist!=="?") &&      // only if valid song, not a news clip
           (song.title.toLowerCase().indexOf("icat ")!=0) ) {  // and not an ad does not begin with icat
        let ll = song.artist.length+song.title.length;
        process.stdout.write(WHITE+song.artist+' - '+CYAN+song.title+RESET+' - '+abbrev(song.cover,72-ll)+'\n');          
        datauris.fromUrl(song.cover, (err,datauri) => {
          let {contenttype,buffer,ext} = datauris.parse(datauri);
          sharp(buffer).resize(200).toBuffer( (err,data) => {
            if (!err) song.cover = datauris.fromBuffer(data,contenttype);
            played.unshift(song);          // insert at first position 
            fs.writeFile(icatfn, JSON.stringify(played), "utf-8", logerror ); // save to disk
          }); 
        });             
      }     
    }    
  }); 
}


// --- main --------------------------------------------------------

(function main(){  
  icatfn = path.normalize(path.resolve(
    process.argv[2] || 
    process.env.ICAT || 
    path.join(os.homedir(),'icat.json')));
     
  favsfn = path.normalize(path.resolve(
    process.argv[3] || 
    process.env.FAVORITES || 
    path.join(os.homedir(),'favorites.json')
  ));   
  
  if (!fs.existsSync(icatfn)) return console.error(icatfn+' not found');
  if (!fs.existsSync(favsfn)) return console.error(favsfn+' not found');
  
  let data = fs.readFileSync(icatfn, "utf-8")
  if (!data) return console.error("can't read "+icatfn);
  let parsed=JSON.parse(data);
  if (!Array.isArray(parsed)) return console.error('invalid '+icatfn) 
  played = parsed;
  playing = played[0];
   
  data=fs.readFileSync(favsfn, "utf-8")
  if (!data) return console.error("can't read "+favsfn);
  parsed=JSON.parse(data);
  if (!Array.isArray(parsed)) return console.error('invalid '+favsfn)
  favorites = parsed;
 
  scrape();                  // now,.. 
  setInterval(scrape,10000); // ..and every 10 secs  
  
  
  
  let port = process.env.PORT || 3210; 
  let server = app.listen(port, function() {
    process.title='iCat server using '+icatfn+' and '+favsfn+'at localhost:'+server.address().port;    
    process.stdout.write(`
iCat server ${YELLOW}${process.argv[1]}${RESET} is now open for e-business
using ${YELLOW}${icatfn}${RESET} 
and ${YELLOW}${favsfn}${RESET}
at ${CYAN}localhost:${server.address().port}${RESET}

`);
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
