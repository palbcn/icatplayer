#! node

/*
  given a img src url, transform it to a data uri
  by calling binaryDonwload.asDataURI
  
  Pere Albert, Barcelona. palbcn@yahoo.com
  copyright(C) 2016. All Rights Reserved.  
*/

var path=require('path');
var fs=require('fs');
var binaryDownload = require('binarydownload');
var urllib = require('url');
var open = require('open');

var transformImageURL = function (imgsrc,callback) {
 
 var parsed = urllib.parse(imgsrc)
 
 if (parsed.protocol=='data:') {   // it's a data: uri already
   callback(null,imgsrc)    

 } else if (parsed.protocol=='file:') {  // it's a file: uri, read it
   fs.readFile(parsed.pathname,'binary', (err,data) => {
     if (err) return callback(err,imgsrc);
     var datab64=data.toString('base64')
     var datauri='data:'+contenttype+';base64,'+datab64
     callback(null,datauri) 
   })   

 } else if ((parsed.protocol=='http:')||(parsed.protocol=='https:')) {  // it's a http: uri, download it
   binaryDownload.asDataURI(imgsrc, (err,datauri) => {
     if (err) return callback(err,imgsrc);
     callback(null,datauri)
   })
   
 } else {    // what else? ftp:, gopher: .... 
   callback(null,urllib.format(parsed))  //  just return it well formatted
 }
}

function view(url){
  console.log(url);
  open(url,'firefox');
}

function test() { 
  var imgurl = process.argv[2] || 'http://placehold.it/100x40';
  transformImageURL(imgurl,(err,data)=>view(data));
};

if (require.main === module) {
  test();
} else {
  module.exports = transformImageURL; 
}