
var lastD = "";

/* insert word breaks in long words at num pos */
String.prototype.wbr = function(num) {  
  return this.replace(
    RegExp("(\\w{" + num + "})(\\w)", "g"), 
    function(all,text,char){return text + "<wbr>" + char;}
  );
}

function reload(){ 
  $.getJSON('/playing',function(data){
    if (data!=lastD) {
      lastD=data;
      $("#playing-cover").attr('src',data.cover);
      $("#playing-artist").text(data.artist);
      $("#playing-song").text(data.song);
      document.title = data.artist+'-'+data.song+' @ iCat.cat & Lo Pere';
    
      $.getJSON('/played',function(songs){
        $("#played").empty();
        songs.slice(1).map(function(song){
          var $li=$("<li/>");
          var $img=$('<img/>').attr('src',song.cover);
          $li.append($img);  
          $li.append($('<p class="timestamp">').text(new Date(song.timestamp).toLocaleString('en-GB')));          
          $li.append($('<p class="artist">').html(song.artist.wbr(10)));
          $li.append($('<p class="song">').html(song.song.wbr(10)));
          $("#played").append($li);
        });
      });
    }
  });
};

$(function(){   
  reload();                  // now,.. 
  setInterval(reload,10000); // ..and every 10 secs   
});
