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

var playedfile = 'icat.json'; 
var played=[];
var playing={};

// --- string utils --------------------------------------------------
// squeeze all runs of repeated whitespace with a single whitespace
String.prototype.squeeze = function() {
  return this.replace(/\s+/g,' ').trim(); 
}

String.prototype.toTitleCase = function()
{
  return this.toLowerCase().replace(/^(.)|\s(.)/g, 
      function($1) { return $1.toUpperCase(); });
}

// --- express middleware --------------------------------------------------
app.use(express.static(__dirname + '/public'));

// --- express routes --------------------------------------------------
app.get('/played', function (req, res) {
  res.send(played);
}); 

function findPlayed(id) {
  for (var i=0,l=played.length; i<l; i++) {
    if (played[i].timestamp==id) {
      return i;
    }
  }
  return -1;
}

app.get('/playing', function (req, res) {
  res.send(playing);
}); 

app.delete('/played/:id',function(req,res) {
  var index=findPlayed(req.params.id);
  if (index==-1) {
    res.status(404).send(req.params.id+" not found");
  } else {
    played.splice(index,1);
    res.send(played);
    fs.writeFileSync(playedfile, JSON.stringify(played), "utf-8");
  }  
});

app.post('/played/:id/:action',function(req,res){
  var index=findPlayed(req.params.id);
  if (index==-1) { 
    res.status(404).send(req.params.id+" not found");
  } else if (req.params.action=="like") {
    played[index].like=!played[index].like;
    var o=played[index];
    //populate all over the songs
    played.map(function(s){
      if ((o.song==s.song) && (o.artist==s.artist)) s.like=o.like;
    });
    res.send(played);
    fs.writeFileSync(playedfile, JSON.stringify(played), "utf-8");
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

var lastT=0;

function adjustAlbum(s,a) {
  var r =s.replace(/^\s*portada del disc\s+/i,""); 
  return r.replace(new RegExp('\\s*(de |d\'|d\' )'+a+'\\s*$',"i"),"");
};


function reloadHTML(err,html) {
  if (err) return console.log(err);
  
  var $content=$('<div>'+html+'</div>');
  var songwords=$content.find("h1").text().split('/'); 
  var artist = songwords[1] ? songwords[1].squeeze().toTitleCase(): "?"; 
  var song = songwords[0] ? songwords[0].squeeze().toTitleCase(): "?";
  var cover=$content.find("img").attr('src');
  var album=$content.find("img").attr('alt');
  var link=$content.find("a").attr('href');
  var s= { 
    artist: artist, 
    song: song, 
    album: album ? adjustAlbum(album,artist).toTitleCase():"",
    cover: cover,
    link: link,
    timestamp: Date.now()    
  };
  played.unshift(s);
  playing=s;
  fs.writeFileSync(playedfile, JSON.stringify(played), "utf-8");
  console.log(s.artist+' - '+s.song);
}

function reloadXML(err,xml){
  if (err) return console.log(err);
  
  var $xml=$(xml);
  var itemIdBloc =$xml.find('#info').attr("idbloc");
  var itemT =$xml.find('#info').attr("t"); 
  if (itemT!=lastT) {
    lastT = itemT;
    var contentURL = contentURLprefix+itemIdBloc; 
    loadFromURL(contentURL, reloadHTML);
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
      return console.log("Can't create "+playedfile);
  }
 
  reload();                  // now,.. 
  setInterval(reload,10000); // ..and every 10 secs  

  var server = app.listen(process.env.PORT || 3210, function () {
    console.log('iCat server is now open for e-business');
    console.log('using',playedfile);
    console.log('at localhost:',server.address().port);
  });
 
})();
