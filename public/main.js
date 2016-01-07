
/* insert word breaks in long words at num pos */
String.prototype.wbr = function(num) {  
  return this.replace(
    RegExp("(\\w{" + num + "})(\\w)", "g"), 
    function(match,submatch1,submatch2){return submatch1 + "<wbr>" + submatch2}
  );
}

function reloadPlayed(songs) {
  $("#played").empty();
  songs.map(function(song){
    $("#played").append(buildSong(song));
  });
};

function playedDelete(id) {
  $('#'+id).hide();
  $.ajax({
    url: '/played/'+encodeURIComponent(id),
    type: 'DELETE',
    success: function(result){ reloadPlayed(result) },
    error: function(result){ console.log('delete error ',result)}
  });
}

function playedLike(id) {
  $.ajax({
    url: '/played/'+encodeURIComponent(id)+'/like',
    type: 'POST',
    success: function(result){ reloadPlayed(result) },
    error: function(result){ console.log('post error ',result)}
  }); 
  
  // immediate feedback: if the icon exists, hide it; if it doesn't, create it.
  if ($('#'+id+' .icon-fav').length==0)
     $('#'+id).append($('<i class="fa fa-heart icon-fav"/>'))
  else
    $('#'+id+' .icon-fav').hide();
}

function buildSong(song) {
  var $li=$('<li id="'+song.timestamp+'"/>');
  var $a=$('<a target="_blank"/>').attr('href',youtubesearch+encodeURIComponent(song.artist+' - '+song.song+' - '));
  var $img=$('<img/>').attr('src',song.cover).attr('title',song.album);
  $a.append($img);  
  $a.append($('<p class="timestamp">').text(new Date(song.timestamp).toLocaleString('en-GB').slice(0,-3)));          
  $a.append($('<p class="artist">').html(song.artist.wbr(10)));
  $a.append($('<p class="song">').html(song.song.wbr(10)));
  $li.append($a);
  var $iconlike=$('<i class="fa '+
                     ((song.like)?'fa-thumbs-down':'fa-thumbs-up')+
                    ' icon-like"/>').hide();         
  var $icondelete=$('<i class="fa fa-trash icon-delete"/>').hide(); 
  if (song.like) $li.append('<i class="fa fa-heart icon-fav"/>'); 
  $li.append($iconlike);
  $li.append($icondelete);         
  $iconlike.click(function() { playedLike($(this).parent()[0].id); });
  $icondelete.click(function(){ playedDelete($(this).parent()[0].id);  });  
  $li.hover(function(){$iconlike.show(); $icondelete.show();},
            function(){$iconlike.hide(); $icondelete.hide();});
  return $li;
};

function buildPlaying(data) {
  if (!data.album) data.album=""; 
  $("#playing-link").attr('href','http://catradio.cat'+data.link);
  $("#playing-cover").attr('src',data.cover).attr('title',data.album);
  $("#playing-artist").text(data.artist);
  $("#playing-song").text(data.song);
  document.title = data.artist+'-'+data.song+' @ iCat.cat & Lo Pere';
}

const youtubesearch="https://www.youtube.com/results?search_query=";
var lastD = 0;
function reload(){ 
  $.getJSON('/playing',function(data){
    if (data.timestamp!=lastD) {
      lastD=data.timestamp;
      buildPlaying(data);      
      $.getJSON('/played',function(songs){
        reloadPlayed(songs);
      });
    }
  });
};


$(function(){   
  reload();                  // now,.. 
  setInterval(reload,10000); // ..and every 10 secs   
});
