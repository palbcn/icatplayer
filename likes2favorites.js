#! node
function findSongInList(song,list) {
  for (var i=0,l=list.length; i<l; i++) {
    if ((list[i].title==song.title)&&(list[i].artist==song.artist)) {
      return i;
    }
  }
  return -1;
}


(function main(inf,ouf){ 

  if (!ouf) return console.log('likes2favorites icat.json favorites.json');
  var icatfn = path.normalize(path.resolve(inf));
  var favsfn = path.normalize(path.resolve(ouf));
 
  if (!fs.existsSync(icatfn)) throw (icatfn+' not found');
  if (!fs.existsSync(favsfn)) throw (favsfn+' not found');
  
  fs.readFile(icatfn, "utf-8", function(err,data) {
    if (err) throw ('can''t read '+icatfn);
    var parsed=JSON.parse(data);
    if (!Array.isArray(parsed)) throw('invalid '+icatfn)
     
    var songs = parsed;
    
    fs.readFile(favsfn, "utf-8", function(err,data) {
      if (err) throw ('can''t read '+favsfn);
      var parsed=JSON.parse(data);
      if (!Array.isArray(parsed)) throw('invalid '+favsfn)
      var favs = parsed;
      var liked = songs.filter(function(s){ return s.like });
      // we want to add in favs all songs that are in liked 
      liked.forEach ( function(s) { 
        if (findSongInList(s,favs)==-1) favs.push({ artist:s.artist, title:s.song,like:true});
      })
// we want to mark all songs that are in favs
           
         songs.map(function(s){ s.like=(findSongInList(s,liked)!=-1) });
         
         
    fs.writeFile(outfile, JSON.stringify(songs), "utf-8", function(){
      console.log('done');
    });
  });
})(process.argv[2],process.argv[3]);


