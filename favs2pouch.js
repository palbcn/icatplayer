#! node
/* Pere Albert, Barcelona <palbcn@yahoo.com> */

var pouchdb = require('pouchdb');
var path = require('path');
var fs = require('fs');
var os = require('os');

(function main() {

  if (process.argv.length<=2) 
    return console.log('favs2pouch favs.json [favs.db]');

  var favsjsonfn = path.normalize(path.resolve(
    process.argv[2] ||
    process.env.FAVORITESJSON || 
    path.join(os.homedir(),'favtunes.json')
  ));
  var favorites = [];

  var data=fs.readFileSync(favsjsonfn, "utf-8");
  if (!data) return console.error("can't read "+favsjsonfn);
  var parsed=JSON.parse(data);
  if (!Array.isArray(parsed)) return console.error('invalid '+favsjsonfn);
  favorites = parsed;
  //favorites.sort( (s1,s2) => s1.artist.localeCompare(s2.artist))
  favorites.map( (song,index) => { song._id=''+(index+1) });
  
  var favsdbfn = path.normalize(path.resolve(
     process.argv[3] ||
     process.env.FAVORITESDB || 
    path.join(os.homedir(),'favtunes.db')
  ));    
 
 
  var db = pouchdb(favsdbfn);
  db.destroy((err,res) => {
    db = pouchdb(favsdbfn);
    console.log('New empty favtunes DB created at ',favsdbfn);
    db.bulkDocs(favorites,(err,res) => {
      if (err) throw err;
      db.info( (err,result) => { 
        console.log('favtunes DB at %s populated with %d entries from %s, resulting %d entries.',favsdbfn,favorites.length,favsjsonfn, result.doc_count);
        //console.log(result);
        db.get('1', (err,doc) => {
          console.log('entry #%s. %s - %s',doc._id,doc.artist,doc.title);
        });
        db.get(''+result.update_seq, (err,doc)=> {
          console.log('entry #%s. %s - %s',doc._id,doc.artist,doc.title);
        });
      });
    });
  });

 
})();