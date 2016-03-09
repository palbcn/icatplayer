#! node

/* Pere Albert, Barcelona. palbcn@yahoo.com */

/* split icat.json by months */


var path=require('path');
var fs=require('fs');

/*******************************************************************************
  group(array,grouperFunc [, aggregatorFunc])
    given an array of objects
    it returns an array of group objects: [{ group:id, items: [] } ]
    
    grouperFunc is called for every element
       it is a function(element[,index[,array]]) that returns a group id
       it can be a simple getter of a property; or a complex hash of several
       properties.
    
    aggregatorFunc, if specified, is called for every group
       it is a function(items) that takes the items property of the group object
       and returns another object. 
       This returned object is used to .extend() the group object. 
       It can be as simple as a counter "return { count: items.length }"
       
*/
function group (array, grouper,aggregator) {
  var groups={};
  for (var i = 0, l = array.length; i < l; i++) {
    var group=grouper(array[i],i,array);
    if (!groups[group]) groups[group]={group:group,items:[]};
    groups[group].items.push(array[i]);
  }
  if (aggregator) {
    Object.keys(groups).map(function(key){
      var aggregation=aggregator(groups[key].items);
      groups[key].extend(aggregation);
    });
  }
  return groups;
};

// song is {"artist":"","song":"","album":"","cover":"","link":"","timestamp":0,"like":false},

// array-like-object to array
function alo2array(alo){
  var k=Object.keys(alo);
  var r=[];
  for (var i=0; i<k.length; i++) {
    r.push({key:k[i],value:alo[k[i]]});
  }
  return r;
}

function leading0(n) {
  return ((n<10)?"0":"")+n;
}

function yearmonth(ms) {
  var d = new Date(ms);
  return ''+d.getFullYear()+'-'+leading0(d.getMonth()+1);
}

function ddmmyyyy(ms) {
  var d = new Date(ms);
  return leading0(d.getDay())       +'/'+
         leading0(d.getMonth()+1)   +'/'+
         d.getFullYear();
}

function dirExists(d) {
  var stats = fs.statSync(d);
  return stats.isDirectory(); 
}

/* . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . */
(function main(){ 
  var infile = path.normalize(path.resolve(process.argv[2])); 
  if (!fs.existsSync(infile)) throw (infile+' not found');
  var outdir = process.argv[3];
  if (!dirExists(outdir)) throw (outdir+' not found');
   
  fs.readFile(infile, "utf-8", function(err,data) {
    var parsed=JSON.parse(data);
    if (Array.isArray(parsed)) { 
      var songs = parsed;
      console.log("%d songs from %s to %s",songs.length,
        ddmmyyyy(songs[songs.length-1].timestamp),
        ddmmyyyy(songs[0].timestamp));
      
      // group songs by month
      var groups = group(songs,function(item) {
        return yearmonth(item.timestamp);
      });
      bymonth=alo2array(groups);
      console.log("%d groups",bymonth.length);
      //console.log("%d groups from %s to %s",groups.length,groups[0].group,groups[groups.length-1].group);
      for (var i=0; i<bymonth.length; i++) {
        console.log('%d - Group %s has %d items',
          i, bymonth[i].value.group, bymonth[i].value.items.length);
        var outfile=path.join(outdir,bymonth[i].value.group+'-icat.json');
        fs.writeFileSync(outfile, JSON.stringify(bymonth[i].value.items), "utf-8");
        console.log("File %s created OK",outfile); 
      }
    }
  });
})();



  
  