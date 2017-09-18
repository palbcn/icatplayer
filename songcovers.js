#! node

/*
  Pere Albert, Barcelona. palbcn@yahoo.com
  copyright(C) 2016. All Rights Reserved.  
*/

var path=require('path');
var fs=require('fs');
var urllib = require('url');

var imgsrc2datauri = require('./imgsrc2datauri');

var open = require('open');


function findImgInList(imgurl,list) {
  for (var i=0,l=list.length; i<l; i++) {
    if (list[i].url==imgurl) {
      return i;
    }
  }
  return -1;
}


(function main(inf,ouf){ 

  if (!ouf) return console.log('songcovers songs.json imgs.json');
  var songsfn = path.normalize(path.resolve(inf));
  var imgsfn = path.normalize(path.resolve(ouf));
 
  if (!fs.existsSync(songsfn)) throw (songsfn+' not found.');
  var songsdata = fs.readFileSync(songsfn, "utf-8");
  if (!songsdata) throw ("can't read "+songsfn);
  var songs=JSON.parse(songsdata);
  if (!Array.isArray(songs)) throw('invalid '+songsfn);
  
  if (!fs.existsSync(imgsfn)) {
    //throw (imgsfn+' not found');
    fs.writeFileSync(imgsfn, JSON.stringify([]), "utf-8");
    console.log(imgsfn," not found. Created.");
  } 
  var imgsdata=fs.readFileSync(imgsfn, "utf-8")
  if (!imgsdata) throw ("can't read "+imgsfn);
  var imgs=JSON.parse(imgsdata);
  if (!Array.isArray(imgs)) throw('invalid '+imgsfn)
  
  // 
  // extract the image source urls and add them to imgs 
  songs.forEach ( function(s) { 
    var imgsrc = '';
    downloadCount=0;
    if (s.img) { imgsrc = s.img }
    else if (s.cover) { imgsrc = s.cover }
    else if (s.image) { imgsrc = s.image }
    else if (s.albumCover) { imgsrc = s.albumCover }
    else if (s.poster) { imgsrc = s.poster }
    
/*  imgs is an array of images to be turned into data uris
    [{url:'',datauri:''},...] */
  
    if (imgsrc) {
      var imgIndex=findImgInList(imgsrc,imgs);
      if (imgIndex==-1) {
        downloadCount++;
        console.log('downloading',downloadCount,imgsrc);   
        (function(src){
          var img = { url: src };
          imgsrc2datauri(src, (err,uri) => { 
            img.datauri=uri;
            imgs.push(img);
            downloadCount--;
            console.log('downloaded,',downloadCount,'pending');   
            if (downloadCount==0) {
              //finally, write the results
              console.log('Finished downloading, writing',imgsfn);   
              fs.writeFileSync(imgsfn, JSON.stringify(imgs), "utf-8");
            }
          });
        })(imgsrc);
      }
    }
  })
  if (downloadCount==0) {
    console.log('done');
  }  
})(process.argv[2],process.argv[3]);



