#! node
/*
 icat directe
 Pere Albert, Barcelona. palbcn@yahoo.com
*/

var config=require('./config');

var fs=require('fs');
var path=require('path');
var superagent = require('superagent');
var $ = require('cheerio');
var express = require('express');
var app = express();
require('pastrings');
require('padates');

const reloadURL = 
  "http://dinamics.catradio.cat/dalet/catradio/icat/v1/refresh_icat.xml";
const contentURLprefix =
  "http://catradio.cat/icat/standalone/icatPlayer/icatplayer/directe/3/";

var played=[];

function savePlayed() {
  if (config.file) {
    fs.writeFileSync(config.file, JSON.stringify(played), "utf-8");
  }; 
}
 
app.use(express.static(__dirname + '/public'));

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
  res.send(played[0]);
}); 

app.delete('/played/:id',function(req,res) {
  var index=findPlayed(req.params.id);
  console.log('delete ',req.params.id,index);
  if (index==-1) {
    res.status(404).send(req.params.id+" not found");
  } else {
    played.splice(index,1);
    res.send(played);
    savePlayed();
  }  
});

app.post('/played/:id/:action',function(req,res){
  var index=findPlayed(req.params.id);
  console.log('post',req.params.action,req.params.id,index); 
  if (index==-1) { 
    res.status(404).send(req.params.id+" not found");
  } else if (req.params.action=="like") {
    played[index].like=!played[index].like;
    res.send(played);
    savePlayed();
  } else {
    res.status(401).send("invalid request "+req.params.action);
  }
});

function loadFromURL(url,cb){
  superagent
    .get(url) 
    .set({"Accept-Encoding" : "gzip,sdch"})    
    .end(function(err,data){
      cb(data.text);
    });
};

var lastT=0;

function reloadHTML(html) {
  var $content=$('<div>'+html+'</div>');
  var song=$content.find("h1").text().split('/'); 
  var cover=$content.find("img").attr('src');
  var album=$content.find("img").attr('alt');
  var s= { 
    artist: song[1] ? song[1].squeeze().toProperCase(): "?", 
    song: song[0] ? song[0].squeeze().toProperCase(): "?", 
    album: album ? album.toProperCase():"",
    cover: cover,
    timestamp: Date.now()    
  };
  played.unshift(s);
  savePlayed();
  console.log(s.artist+' - '+s.song);
}

function reloadXML(xml){
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

(function main(){  
  if (config.file && fs.existsSync(config.file)) {
    fs.readFile(config.file, "utf-8", function(err,data) {
        var parsed=JSON.parse(data);
        if (Array.isArray(parsed)) { 
          played = parsed;
        }
    });
  }
 
  reload();                  // now,.. 
  setInterval(reload,10000); // ..and every 10 secs  

  var server = app.listen(3210, function () {
    console.log('iCat server is now open for e-business');
    console.log('for',config.file);
    console.log('at localhost:',server.address().port);
  });
 
})();
