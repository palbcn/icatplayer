#! node

/* Pere Albert, Barcelona. palbcn@yahoo.com */

/* split icat.json by months */


var path=require('path');
var fs=require('fs');

var grouper=require('pagrouper');

/******************************************************************************/
function leading0(n) {
  return ((n<10)?"0":"")+n
}

function yearmonth(ms) {
  var d = new Date(ms);
  return ''+d.getFullYear()+'-'+leading0(d.getMonth()+1);
}

function ddmmyyyy(ms) {
  var d = new Date(ms)
  return leading0(d.getDay())       +'/'+
         leading0(d.getMonth()+1)   +'/'+
         d.getFullYear()
}

function dirExists(d) {
  var stats = fs.statSync(d)
  return stats.isDirectory()
}

/******************************************************************************/
(function main(){ 
  if (process.argv.length<4) {
    return console.error('node archiveMonthly songs.json archivesdir');
  }
  var infile = path.normalize(path.resolve(process.argv[2]))
  if (!fs.existsSync(infile)) throw (infile+' not found')
  var outdir = process.argv[3]
  if (!dirExists(outdir)) throw (outdir+' not found')
   
  fs.readFile(infile, "utf-8", function(err,data) {
    var parsed=JSON.parse(data);
    if (Array.isArray(parsed)) { 
      var songs = parsed;
      console.log("%d songs from %s to %s",songs.length,
        ddmmyyyy(songs[songs.length-1].timestamp),
        ddmmyyyy(songs[0].timestamp));
      
      // group songs by month 
      var bymonth = grouper.group(songs,function(item) {
        return yearmonth(item.timestamp);
      })
      //bymonth=bymonth.sort(function(g1,g2){return g1.group.localeCompare(g2.group) });

      console.log("%d groups by month",bymonth.length);
      for (var i=0; i<bymonth.length; i++) {
        console.log('%d - Group %s has %d items',
          i+1, bymonth[i].group, bymonth[i].items.length);
        var outfile=path.join(outdir,bymonth[i].group+'-icat.json');
        fs.writeFileSync(outfile, JSON.stringify(bymonth[i].items), "utf-8");
        console.log("File %s created OK",outfile); 
      }
    }
  })
})()



  
  