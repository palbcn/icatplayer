

var path=require('path');
var fs=require('fs');

function adjustAlbum(s,a) {
  var r =s.replace(/^\s*portada del disc\s+/i,""); 
  return r.replace(new RegExp('\\s*de '+a+'\\s*$',"i"),"");
};

function adjustsong(s) {
  if (s.album) s.album=adjustAlbum(s.album,s.artist);
  return s;
}

(function main(){ 

  var infile = path.normalize(path.resolve(process.argv[2]));
  var outfile = path.normalize(path.resolve(process.argv[3]));
 
  if (!fs.existsSync(infile)) throw (infile+' not found');
  if (fs.existsSync(outfile)) throw (outfile+' already exists');
  
  fs.readFile(infile, "utf-8", function(err,data) {
    var parsed=JSON.parse(data);
    if (Array.isArray(parsed)) { 
      var songs = parsed;
      songs.map(adjustsong);
      fs.writeFile(outfile, JSON.stringify(songs), "utf-8", function(){
        console.log('done');
      });
    }
  });
})();



  
  