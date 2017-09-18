#! node
/*
 icat directe Server
 Lo Pere, Barcelona. palbcn@yahoo.com
*/

var fs=require('fs')
var path=require('path')
var os=require('os')
var superagent = require('superagent')
require('superagent-charset')(superagent)
var $ = require('cheerio')
var express = require('express')
var app = express()

const ARAFEM_URL = "http://dinamics.ccma.cat/public/apps/catradio/v2/arafem/arafem_ic.json";
 
var played=[]  // previously played songs list
var playing={} // currently playing song
var icatfn = 'icat.json'; 

var favorites=[]
var favsfn = 'favorites.json'

// --- played list utils  ----------------------------------------------
function findSongInList(song,list) {
  for (var i=0,l=list.length; i<l; i++) {
    if ((list[i].title==song.title)&&(list[i].artist==song.artist)) {
      return i;
    }
  }
  return -1;
}

function findIdInList(id,list) {
  for (var i=0,l=list.length; i<l; i++) {
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
 app.use('/vendor',express.static('/pere/sources/html/vendor'));
 app.use('/assets',express.static('/pere/sources/html/assets'));
} else {
 app.use('/vendor',express.static(__dirname + '/public/vendor'));
 app.use('/assets',express.static(__dirname + '/public/assets')); 
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
  var index=findIdInList(req.params.id,played);
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
  var index=findIdInList(req.params.id,played)
  if (index==-1) { 
    console("404 "+req.params.id+" not found");
    return res.status(404).send(req.params.id+" not found");
  } 
  console.time('like '+req.params.id)
 
  played[index].like = !played[index].like;
  var reqsong = {
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
  console.error(err.response
    ?err.response.request.method+' '+err.response.request.url+' '+err.status
    :err); 
}

// ---- basic functions --------------------------

function squeeze(s) {
  return s.replace(/\s+/g,' ').trim(); 
}

function toTitleCase(s) {
  return s.toLowerCase().replace(/^(.)|\s(.)/g, 
      function($1) { return $1.toUpperCase(); });
}


function ifExists(s) {
  return s ? s: "?"; 
}
function adjust(s) {
  return toTitleCase(squeeze(ifExists(s)));
}

var lastID=0;

function scrape() {
  loadFromURL(ARAFEM_URL, (err,json) => {
    if (err) return logerror(err);
    var d = JSON.parse(json);
    if (d.canal && d.canal.ara_fem && d.canal.ara_fem.arasona &&
        (d.canal.ara_fem.arasona.bloc_id != lastID)) {
      var song= { 
        id: d.canal.ara_fem.arasona.bloc_id,  
        artist: adjust(d.canal.ara_fem.arasona.interpret), 
        title: adjust(d.canal.ara_fem.arasona.tema), 
        cover: ifExists(d.canal.ara_fem.arasona.imatges.imatge.text),
        timestamp: Date.now()  
      };
      var idx=findSongInList(song,played); 
      song.like = (idx==-1) ? false : played[idx].like;  
      
      playing=song;         // show as currently played
      if (played[0].id!=song.id) {
        played.unshift(song); // insert in played list only if not already inserted [occurs in restarts]
        fs.writeFileSync(icatfn, JSON.stringify(played), "utf-8"); // save to disk
        console.log(song.artist+' - '+song.title);
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
  
  var data = fs.readFileSync(icatfn, "utf-8")
  if (!data) return console.error("can't read "+icatfn);
  var parsed=JSON.parse(data);
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

  var server = app.listen(process.env.PORT || 3210, function () {
    console.log('iCat server (%s) is now open for e-business',process.argv[1])
    console.log('using %s and %s',icatfn,favsfn)
    console.log('at localhost:%d',server.address().port)
  })
 
})()
