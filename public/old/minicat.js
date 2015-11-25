// for webscraping we need to overcome the same origin policy
// quick and dirty
// use whateverorigin.org 
// but we should set our own proxy server here.
function getCrossHtml(url,cb){
    $.getJSON('http://whateverorigin.org/get?url='+encodeURIComponent(url)+'&callback=?', 
      function(data){
        cb(data.contents);
      });
};

const refreshURL="http://dinamics.catradio.cat/dalet/catradio/icat/v1/refresh_icat.xml";
const contentURLprefix ="http://catradio.cat/icat/standalone/icatPlayer/icatplayer/directe/3/";

var lastT=0;
var played=[];

function refreshHTML(html) {
  console.log(html.slice(0,480).replace(/[\n\r]/g,' '),"... ");   
  var $content=$('<div>'+html+'</div>');
  $content.find("script").remove(); // remove all scripts
  $content.find("a").contents().unwrap(); // remove a tags but keep their contents.
  console.dir($content);
  
  var song=$content.find("h1").text().toLowerCase().split('/');
  //var song=$content.find("h1").text().toLowerCase().split('/').reverse().join('<br><br>');
  
  var $cover=$content.find("img");
  $("#playing").html($cover);
  $("#playing").append($('<p class="artist">').html(song[1]));
  $("#playing").append($('<p class="song">').html(song[0]));
  
  var s=song[1]+' - '+song[0];
  document.title = 'iCat.cat : '+s;
  played.unshift(s);
  localStorage.setItem("played",JSON.stringify(played));
  $("#played").prepend($("<li>").text(s)); 
}

function refreshXML(xml){
  var itemIdBloc =$(xml).find('#info').attr("idBloc");
  var itemT =$(xml).find('#info').attr("t"); 
  console.log(refreshURL,": ",xml.slice(0,480).replace(/[\n\r]/g,' '),"... ",itemIdBloc,' and ',itemT); 
  if (itemT!=lastT) {
    lastT = itemT;
    var contentURL = contentURLprefix+itemIdBloc; 
    getCrossHtml(contentURL, refreshHTML);
  };  
};

function reload(){ 
  getCrossHtml(refreshURL, refreshXML); 
}

$(function(){   
  if (localStorage.getItem("played"))
    played = JSON.parse(localStorage.getItem("played"));  
  played.map(function(li){$("#played").append($("<li/>").text(li))})
  reload();                  // now,.. 
  setInterval(reload,10000); // ..and every 10 secs   
});
