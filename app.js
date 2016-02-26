#! node
/*
 icat directe Server
 Lo Pere, Barcelona. palbcn@yahoo.com
*/

var fs=require('fs');
var path=require('path');
var os=require('os');
var superagent = require('superagent');
var $ = require('cheerio');
var express = require('express');
var app = express();

const reloadURL = 
  "http://dinamics.catradio.cat/dalet/catradio/icat/v1/refresh_icat.xml";
const contentURLprefix =
  "http://catradio.cat/icat/standalone/icatPlayer/icatplayer/directe/3/";

var played=[];  // previously played songs list
var playing={}; // currently playing song
var playedfile = 'icat.json'; 

// --- played list utils  ----------------------------------------------
function findSongInList(song,list) {
  for (var i=0,l=list.length; i<l; i++) {
    if ((list[i].song==song.song)&&(list[i].artist==song.artist)) {
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

// --- express middleware --------------------------------------------------
app.use(express.static(__dirname + '/public'));

// --- express routes --------------------------------------------------
app.get('/played', function (req, res) {
  res.send(played);
}); 

app.get('/playing', function (req, res) {
  res.send(playing);
}); 

app.delete('/played/:id',function(req,res) {
  var index=findIdInList(req.params.id,played);
  if (index==-1) {
    res.status(404).send(req.params.id+" not found");
  } else {
    console.time('delete '+req.params.id);
    played.splice(index,1);
    res.send(played);
    fs.writeFileSync(playedfile, JSON.stringify(played), "utf-8");
    console.timeEnd('delete '+req.params.id);
  }  
});

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
      if ((o.song==s.song) && (o.artist==s.artist)) s.like=o.like;
    });
    res.send(played);
    fs.writeFileSync(playedfile, JSON.stringify(played), "utf-8");
    console.timeEnd('like '+req.params.id);
  } else {
    res.status(401).send("invalid request "+req.params.action);
  }
});

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
function reloadHTML(err,html) {
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
    song: title, 
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
  fs.writeFileSync(playedfile, JSON.stringify(played), "utf-8"); // save to disk
  console.timeEnd(artist+' - '+title);
}

// ---- reload info xml ----
var lastT=0;

function reloadXML(err,xml){
  if (err) return logerror(err); 
  var $xml=$(xml);
  var itemIdBloc =$xml.find('#info').attr("idbloc");
  var itemT =$xml.find('#info').attr("t"); 
  if (itemT!=lastT) {   // info idblock t has changed ?
    lastT = itemT;
    loadFromURL(contentURLprefix+itemIdBloc, reloadHTML);
  }; 
};

function reload(){ 
  loadFromURL(reloadURL, reloadXML); 
}

// --- main --------------------------------------------------------

(function main(){  
  playedfile = path.normalize(path.resolve(
    process.argv[2] || 
    process.env.ICAT || 
    path.join(os.homedir(),'icat.json')));
  if (fs.existsSync(playedfile)) {
    fs.readFile(playedfile, "utf-8", function(err,data) {
      var parsed=JSON.parse(data);
      if (Array.isArray(parsed)) { 
        played = parsed;
        playing = played[0];
      }
    });
  } else {
    fs.writeFileSync(playedfile, JSON.stringify(played), "utf-8");
    if (!fs.existsSync(playedfile)) 
      return console.error("Can't create %s",playedfile);
  }
 
  reload();                  // now,.. 
  setInterval(reload,10000); // ..and every 10 secs  

  var server = app.listen(process.env.PORT || 3210, function () {
    console.log('iCat server is now open for e-business');
    console.log('using',playedfile);
    console.log('at localhost:',server.address().port);
  });
 
})();
