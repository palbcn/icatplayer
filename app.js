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

const refreshURL = 
  "http://dinamics.catradio.cat/dalet/catradio/icat/v1/refresh_icat.xml";
const contentURLprefix =
  "http://catradio.cat/icat/standalone/icatPlayer/icatplayer/directe/3/";

var played=[];
 
app.use(express.static(__dirname + '/public'));

app.get('/played', function (req, res) {
  res.send(played);
}); 

app.get('/playing', function (req, res) {
  res.send(played[0]);
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

function refreshHTML(html) {
  var $content=$('<div>'+html+'</div>');
  var song=$content.find("h1").text().split('/'); 
  var cover=$content.find("img").attr('src');
  var s= { 
    artist: song[1] ? song[1].squeeze().toProperCase(): "?", 
    song: song[0] ? song[0].squeeze().toProperCase(): "?", 
    cover: cover,
    timestamp: Date.now()    
  };
  played.unshift(s);
  if (config.file) {
    console.log('writeFile('+config.file+')');
    fs.writeFileSync(config.file, JSON.stringify(played), "utf-8");
  }; 
 
  console.log(JSON.stringify(played,null,2));
}

function refreshXML(xml){
  var $xml=$(xml);
  var itemIdBloc =$xml.find('#info').attr("idbloc");
  var itemT =$xml.find('#info').attr("t"); 
  if (itemT!=lastT) {
    lastT = itemT;
    var contentURL = contentURLprefix+itemIdBloc; 
    loadFromURL(contentURL, refreshHTML);
  };  
};

function reload(){ 
  loadFromURL(refreshURL, refreshXML); 
}

(function main(){  

  if (config.file && fs.existsSync(config.file)) {
    console.log('readFile('+config.file+')');
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
    console.log('minicat open for e-business as ', server.address());
  });
 
})();


