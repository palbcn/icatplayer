#! node
/*
 icat directe Server
 Lo Pere, Barcelona. palbcn@yahoo.com
*/

var fs=require('fs')
var path=require('path')
var os=require('os')
var superagent = require('superagent')
var $ = require('cheerio')
var express = require('express')
var app = express()

const REFRESH_URL = 
  "http://dinamics.catradio.cat/dalet/catradio/icat/v1/refresh_icat.xml"
const CONTENT_URL_PREFIX =
  "http://catradio.cat/icat/standalone/icatPlayer/icatplayer/directe/3/"

const ALL_CHANNELS_URL = "http://catradio.cat/icat/standalone/icatPlayer/icatplayer/canals/foo/bar"
 
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


/*
app.post('/played/:id/:action',function(req,res){
  var index=findIdInList(req.params.id,played);
  if (index==-1) { 
    res.status(404).send(req.params.id+" not found");
  } else if (req.params.action=="like") {
    console.time('like '+req.params.id);
    played[index].like=!played[index].like;
    var o=played[index];
    //populate all over the songs
    played.map(function(s){
      if ((o.title==s.title) && (o.artist==s.artist)) s.like=o.like;
    });
    res.send(played);
    fs.writeFileSync(playedfile, JSON.stringify(played), "utf-8");
    console.timeEnd('like '+req.params.id);
  } else {
    res.status(401).send("invalid request "+req.params.action);
  }
});
*/

// --- extract remote content -------------------------------------------
function loadFromURL(url,cb){
  superagent
    .get(url) 
    .set({"Accept-Encoding" : "gzip,sdch"})    
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

function adjustAlbum(s,a) {
  var r =s.replace(/^\s*portada del disc\s+/i,""); 
  r = r.replace(new RegExp('\\s*(de |d\'|d\' )'+a+'\\s*$',"i"),"");
  return toTitleCase(r);
};

// ---- reload content html ----

function scrapeHTML(err,html) {
  if (err) return logerror(err);
   
  var $content=$('<div>'+html+'</div>');
  var songTitleSlashArtist=$content.find("h1").text();
  var songTitleArtist=songTitleSlashArtist.split('/'); 
  var artist = songTitleArtist[1] ? toTitleCase(squeeze(songTitleArtist[1])): "?"; 
  var title = songTitleArtist[0] ? toTitleCase(squeeze(songTitleArtist[0])): "?";
  var cover=$content.find("img").attr('src');
  var album=$content.find("img").attr('alt');
  var link=$content.find("a").attr('href');
  var s= { 
    artist: artist, 
    title: title, 
    album: album ? adjustAlbum(album,artist):"",
    cover: cover,
    link: link,
    timestamp: Date.now()  
  };
  console.time(artist+' - '+title);
  var idx=findSongInList(s,played); 
  s.like = (idx==-1) ? false : played[idx].like;  
  played.unshift(s); // insert in played list
  playing=s;         // show as currently played
  fs.writeFileSync(icatfn, JSON.stringify(played), "utf-8"); // save to disk
  console.timeEnd(artist+' - '+title);
}

// ---- reload scraped info xml ----
var lastT=0;

function scrapeXML(err,xml){
  if (err) return logerror(err);
  var $xml=$(xml);
  var itemIdBloc =$xml.find('#info').attr("idbloc");
  var itemT =$xml.find('#info').attr("t");
  if (itemT!=lastT) {   // info idblock t has changed ?
    lastT = itemT;
    loadFromURL( CONTENT_URL_PREFIX + itemIdBloc, scrapeHTML);
  }; 
};

function scrape(){ 
  loadFromURL( REFRESH_URL, scrapeXML); 
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
