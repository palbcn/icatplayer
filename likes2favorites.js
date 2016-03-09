#! node

/*
  Pere Albert, Barcelona. palbcn@yahoo.com
  copyright(C) 2016. All Rights Reserved.  
*/
var path=require('path');
var fs=require('fs');


function findSongInList(song,list) {
  for (var i=0,l=list.length; i<l; i++) {
    if ((list[i].title==song.title)&&(list[i].artist==song.artist)) {
      return i
    }
  }
  return -1
}


(function main(inf,ouf){ 

  if (!ouf) return console.log('likes2favorites icat.json favorites.json');
  var icatfn = path.normalize(path.resolve(inf));
  var favsfn = path.normalize(path.resolve(ouf));
 
  if (!fs.existsSync(icatfn)) throw (icatfn+' not found');
  if (!fs.existsSync(favsfn)) throw (favsfn+' not found');
  
  var data = fs.readFileSync(icatfn, "utf-8")
  if (!data) throw ("can't read "+icatfn);
  var parsed=JSON.parse(data);
  if (!Array.isArray(parsed)) throw('invalid '+icatfn)
  var songs = parsed;
 
  data=fs.readFileSync(favsfn, "utf-8")
  if (!data) throw ("can't read "+favsfn);
  parsed=JSON.parse(data);
  if (!Array.isArray(parsed)) throw('invalid '+favsfn)
  var favs = parsed;
  
  // extract only liked songs
  var liked = songs.filter(function(s){ return s.like });
   
  // we want to add in favs all songs that are in liked 
  liked.forEach ( function(s) { 
    if (findSongInList(s,favs)==-1) { 
      console.log('adding %s - %s to favorites',s.artist,s.title)
      favs.push( { artist:s.artist, title:s.title, like:true})
    }
  })

  // and we want to mark all songs that are in favs        
  songs.map ( function(s) { 
    if (findSongInList(s,favs)!=-1 && !s.like ) {
      console.log('marking %s - %s in songs',s.artist,s.title)
      s.like=true
    }
  })
  
  //finally, write the results
  fs.writeFileSync(favsfn, JSON.stringify(favs), "utf-8")
  fs.writeFileSync(icatfn, JSON.stringify(songs), "utf-8")
  console.log('done');
  
})(process.argv[2],process.argv[3]);


