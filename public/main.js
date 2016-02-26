
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

/* deprecated
function gray() {
 $("body").append("<div id=\"overlay\"/>"); 
}
function ungray() {
 $("#overlay").remove(); 
}*/


function deactivateUserInteraction(){
 // we could use different strategies. 
 // here we just change the visibility of the action icons.
  // debug $("body").css("background-color","white");
  $(".icon-like , .icon-remove").each(function() {
    $(this).css("visibility","hidden");
  });
  // and change the pointer
  $("body").css("cursor","progress");
}

function reactivateUserInteraction(){
  // debug $("body").css("background-color","black");
  $(".icon-like , .icon-remove").each(function() {
    $(this).css("visibility","visible"); 
  });
  $("body").css("cursor","auto");
};

function playedDelete(id) {
  // immediate feedback: hide the id
  $('#'+id).hide();
  // and deactivate the icons
  deactivateUserInteraction();
  $.ajax({
    url: '/played/'+encodeURIComponent(id),
    type: 'DELETE',
    success: function(result){ reloadPlayed(result) },
    error: function(result){ console.log('delete error ',result)},
    complete: function () { reactivateUserInteraction() }
  });
}

function playedLike(id) {
  // immediate feedback: if the icon exists, hide it; if it doesn't, create it.
  if ($('#'+id+' .icon-fav').length==0)
     $('#'+id).append($('<i class="fa icon-fav"/>'))
  else
    $('#'+id+' .icon-fav').hide();
  deactivateUserInteraction();
  $.ajax({
    url: '/played/'+encodeURIComponent(id)+'/like',
    type: 'POST',
    success: function(result){ reloadPlayed(result) },
    error: function(result){ console.log('post error ',result)},
    complete: function () { reactivateUserInteraction() }
  }); 
  
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
  var $iconlike=$('<i title="'+((song.like)?'unlike':'like')+'" class="fa '+
                     ((song.like)?'fa-thumbs-down':'fa-thumbs-up')+
                    ' icon-like"/>').hide();                        
  var $iconremove=$('<i title="remove" class="fa icon-remove"/>').hide(); 
  $li.append($iconlike);
  $li.append($iconremove); 
  
  $iconlike.click(function() { playedLike($(this).parent()[0].id); });
  $iconremove.click(function(){ playedDelete($(this).parent()[0].id);  }); 
  
  if (song.like) {
     var $iconfav=$('<i class="fa icon-fav"/>');   
     $li.append($iconfav); 
     $iconfav.click(function() { playedLike($(this).parent()[0].id); });
  };
  
  $li.hover(function(){$iconlike.show(); $iconremove.show();},
            function(){$iconlike.hide(); $iconremove.hide();});
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

/* useless
function refreshPlayingTime(now,last) {
  $("#playing-label").text(
    'iCat en directe. '+ new Date(now).toLocaleString('en-GB')+
    '. Ara sona. ' + new Date(last).toLocaleString('en-GB'));
};
*/

const youtubesearch="https://www.youtube.com/results?search_query=";
var lastD = 0;

function reload(){ 
  $.ajax({
    dataType: "json",
    url: '/playing',
    success: function(data){
      if (data.timestamp!=lastD) {
        deactivateUserInteraction();
        lastD=data.timestamp;
        buildPlaying(data);      
        $.ajax({
          dataType: "json",
          url: '/played',
          success: function(songs){
            reloadPlayed(songs);
          },
          complete: function () { reactivateUserInteraction() }
        });
      }
    }
  })
}
  

$(function(){   
  reload();                  // now,.. 
  setInterval(reload,10000); // ..and every 10 secs   
});
