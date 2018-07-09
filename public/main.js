/* 
  icat client code 
  Pere Albert, Barcelona <palbcn@yahoo.com> 
  Copyright (C) 2016. All Rights Reserved.
*/

var persist = { 
  songs: [], 
  favorites: [] 
};

/* ----------------- insert word breaks in long words at num pos --- */
String.prototype.wbr = function(num) {  
    var r =  this.replace ( RegExp("(\\w{" + (num?num:10) + "})(\\w)", "g"),
    function(match,submatch1,submatch2){
      return submatch1 + "<wbr>" + submatch2
    }
  )
  return r
}

/* ----------------- show feedback for long operations --- */
/* deprecated, use 
function gray() {
 $("body").append("<div id=\"overlay\"/>"); 
}
function ungray() {
 $("#overlay").remove(); 
}*/

function activateUserInteraction ( setunset ) { 
 // we could use different strategies. 
 // here we just change the visibility of the action icons.
  
  if (setunset) {    // when true, reactivate
    $(".icon-like , .icon-remove").each(function() {
      $(this).css("visibility","visible") 
    })
    $("body").css("cursor","auto")
   
  } else {          // when false, deactivate
    $(".icon-like , .icon-remove").each(function() {
      $(this).css("visibility","hidden");
    });
    // and change the pointer
    $("body").css("cursor","progress");
    
  }
}

function deactivateUserInteraction(){
  activateUserInteraction(false)
}

function reactivateUserInteraction(){
  activateUserInteraction(true)
}

/* ----------------- primitive actions --- */
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
  })
}

function like(id) {
  // immediate feedback: if the icon exists, hide it; if it doesn't, create it.
  if ($('#'+id+' .icon-fav').length==0)
     $('#'+id).append($('<i class="fa icon-fav"/>'))
  else
    $('#'+id+' .icon-fav').hide()
  deactivateUserInteraction()
  
  $.ajax({
    url: '/like/'+encodeURIComponent(id),
    type: 'POST',
    success: function(result){ 
      persist.favorites=result; 
      rebuildSongs() 
    },
    error: function(result){ console.log('post error ',result)},
    complete: function () { reactivateUserInteraction() }
  })
}

/* -------------------- */
function findSongInList(song,list) {
  for (var i=0,l=list.length; i<l; i++) {
    if ((list[i].title==song.title)&&(list[i].artist==song.artist)) {
      return i;
    }
  }
  return -1;
}

/* ----------------- presentation functions --- */
const YOUTUBESEARCH="https://www.youtube.com/results?search_query=";

function buildSong(song) {
  var $li=$('<li id="'+song.timestamp+'"/>');
  var $a=$('<a target="_blank"/>')
    .attr('href',YOUTUBESEARCH+encodeURIComponent(song.artist+' - '+song.title+' - '));
  var $img=$('<img/>')
    .attr('src',song.cover);
  $a.append($img);  
  $a.append($('<p class="timestamp">')
    .text(new Date(song.timestamp).toLocaleString('en-GB').slice(0,-3)));          
  $a.append($('<p class="artist">')
    .html(song.artist.wbr()));
  $a.append($('<p class="song">')
    .html(song.title.wbr()));
  $li.append($a);
  var $iconlike=$('<i title="'+((song.like)?'unlike':'like')+
    '" class="fa '+((song.like)?'fa-thumbs-down':'fa-thumbs-up')+
    ' icon-like"/>')
    .hide();                        
  var $iconremove=$('<i title="remove" class="fa icon-remove"/>').hide() 
  $li.append($iconlike)
  $li.append($iconremove) 
  
  $iconlike.click(function() { like($(this).parent()[0].id) })
  $iconremove.click(function(){ playedDelete($(this).parent()[0].id)  }) 
  
  if (song.like) {
     var $iconfav=$('<i class="fa icon-fav"/>');   
     $li.append($iconfav); 
     //$iconfav.click(function() { like($(this).parent()[0].id); });
  }
  
  $li.hover(function(){$iconlike.show(); $iconremove.show() },
            function(){$iconlike.hide(); $iconremove.hide() });
  return $li;
};


/* -------------------------------------- presentation functions --- */
function buildPlaying(data) {
  $("#playing-cover img").attr('src',data.cover?data.cover:'noimage.jpg')
  $("#playing-artist").html(data.artist.wbr()); 
  $("#playing-song").html(data.title.wbr());
  document.title = data.artist+' - '+data.title+' @ iCat.cat & Lo Pere';
}


/* ------------------------------------- presentation functions --- */
function rebuildSongs() {
 
  var songs = persist.songs
  var favs = persist.favorites 
 
  // mark as liked all the songs that are in favs        
  songs.map ( function(s) { 
    var idx = findSongInList(s,favs);
    if (idx!=-1) {
      s.like=favs[idx].like;
    }
  })  
   
  // empty the list of songs and reappend one by one
  $("#played").empty()
  songs.map(function(song){
    $("#played").append(buildSong(song));
  })
  
  $("#played-total").text(songs.length);
  $("#liked-total").text( songs.reduce( (a,e)=>e.like?a+1:a , 0 ));

}

/*--- fetch and show --------------------------------------------------*/
var lastD = 0;

function reloadPlaying(cb) {
  $.ajax({
    dataType: "json",
    url: '/playing',
    success: function(data){
      if (data.timestamp!=lastD) {
        lastD=data.timestamp;
        cb(data);        
      }
    }
  })
}

function reloadFavorites(cb) {
  $.ajax({
    dataType: "json",
    url: '/favorites',
    success: cb
  })
}

function reloadPlayed(cb) {
   $.ajax({
     dataType: "json",
     url: '/played',
     success: cb
   })
}
  
function reload(){ 
  reloadPlaying( function ( playing ) {
    deactivateUserInteraction()
    buildPlaying(playing) 
    
    reloadPlayed ( function( songs ) {
      persist.songs = songs
      rebuildSongs()
      reactivateUserInteraction()           
    })
    
    reloadFavorites ( function (favs) {
      persist.favorites = favs
      rebuildSongs()
    }) 
  })
}

/* ----------------- player actions --- */
function playerActions() {
  
  // single button play/pause
  /*$('#player-pause').click(function() {   
    if ($("#player").prop("paused")) $("#player").get(0).play();
    else $("#player").get(0).pause();
    //$('#pause').text($("#player").prop("paused")?"play":"pause");
    $('#player-pause i').toggleClass('fa-pause');
    $('#player-pause i').toggleClass('fa-play');
  });*/  
  // play/pause two buttons
  $('#player-pause').click(function() {
    $('#player').get(0).pause();
    $('#player-pause').prop('disabled', true);
    $('#player-play').prop('disabled', false);
  });
  $('#player-play').click(function() {  
    $('#player').get(0).play();
    $('#player-pause').prop('disabled', false);
    $('#player-play').prop('disabled', true);
  });
  
  // single button mute/unmute  
  $('#player-mute').click(function() {
    $("#player").prop("muted",!$("#player").prop("muted"));
    $('#player-mute i').toggleClass('fa-volume-up');
    $('#player-mute i').toggleClass('fa-volume-off');
  });
}

  
/*--------------- kick off-----------------------------------------*/
$(function(){ 
  playerActions();
  reload();                     // reload right now,.. 
  setInterval(reload,20000);    // ..and then every 20 secs   
})
