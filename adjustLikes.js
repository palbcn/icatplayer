#! node

var path=require('path');
var fs=require('fs');

function findSongInList(song,list) {
  for (var i=0,l=list.length; i<l; i++) {
    if ((list[i].title==song.title)&&(list[i].artist==song.artist)) {
      return i;
    }
  }
  return -1;
}


(function main(inf,ouf){ 

  var infile = path.normalize(path.resolve(inf));
  var outfile = path.normalize(path.resolve(ouf));
 
  if (!fs.existsSync(infile)) throw (infile+' not found');
  if (fs.existsSync(outfile)) throw (outfile+' already exists');
  
  fs.readFile(infile, "utf-8", (err,data) => {
    var parsed=JSON.parse(data);
    if (!Array.isArray(parsed)) throw('invalid '+infile)
     
    var songs = parsed;
    var liked = songs.filter( s => s.like );
    songs.map(  s  =>  s.like=(findSongInList(s,liked)!=-1) );
    fs.writeFile(outfile, JSON.stringify(songs), "utf-8", () => console.log('done') );
  });
})(process.argv[2],process.argv[3]);
