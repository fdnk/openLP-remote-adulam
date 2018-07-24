window.SongSearch = {
  // Search songs in internal DB
  
  lastUpdate: undefined,
  songList: {},
  songLyrics: [],

  // Methods
  update: function (){
    // Query for all songs
    this.updateDoneCallback = function(){
      console.log("Database updated.");
      // Persist data
      if (this.persist_data()){
        console.log("Data persisted!");
      }else{
        console.log("I can't persist songs :(");
      }
      // Modal update
      $("#updateProgess").removeClass("progress-bar-animated");
      $("#updatingModal").modal('hide');
      $.getJSON("/api/display/theme");
    };

    $('#updatingModal').modal(focus);
    $.getJSON("/api/display/hide");

    var query = "";
    var text = "{\"request\": {\"text\": \"" + query + "\"}}";
    var self = this;
    $.getJSON("/api/songs/search", {data:text}, function (data, status) {
      if(data.results.items.length == 0){
        console.log("No songs available.");
      }

      self.songList = {};
      data.results.items.forEach(function(elem){
        self.songList[elem[0]] = {title: (elem[1]||""), alt: (elem[2]||"")}
      });

      self._updateAllSongs();
    });
    // Set update time
    this.lastUpdate = (new Date()).getTime();

  },
  _updateAllSongs: function(){
    this.updating = true;
    this.updating_index = 0;

    this._updateNextSong();
  },
  _updateNextSong: function(){
    var songkeys = Object.keys(this.songList);
    console.log("_updateNextSong: "+this.updating+"|"+songkeys.length);
    // Update Bar
    var progress = "" + Math.round(this.updating_index/songkeys.length*100) + "%";
    $("#updateProgess").text(progress);
    $("#updateProgess").css("width",progress);

    if(! this.updating){
      console.log("[ERROR] Strange call to _updateNextSong.");
      return;
    }
    if(this.updating_index >= songkeys.length){
      this.updating = false;
      this.updateDoneCallback();
      return;
    }

    //var index = this.songList[songkeys(this.updating_index)][0];
    var index = this.updating_index;
    console.log("Now updating: "+ index);
    this._updateSong(index, function(){
      SongSearch.updating_index++;
      SongSearch._updateNextSong(); // recursive call
    });

  },
  _updateSong: function(index, callback_fn){
    var songkeys = Object.keys(SongSearch.songList);

    console.log("----------------\nUpdating song "+index);
    // get current song id
    // TODO: Use OpenLPControl.setSong() instead
    $.getJSON(
      "/api/controller/live/text",
      function cb(data, st){
        var prev_song_id = data.results.item; // id changes when the song is re-setted

        var server_iterations = 0;
        // Set new song
        var id = songkeys[index];
        var text = "{\"request\": {\"id\": " + id + "}}";
        $.getJSON("/api/songs/live", {"data": text}); // Callback doesn't work

        function getSongText(){
          console.log("The song is: "+ id);
          $.getJSON(
            "/api/controller/live/text",
            function cb(data, st){
              console.log("prev song:" + prev_song_id + "\ncurrent:  " + data.results.item);
              if(data.results.item == prev_song_id){
                // Song not changed yet
                if(server_iterations++ >= 10){
                  throw "OpenLP doesn't response";
                }
                setTimeout(getSongText, 200);
              } else {
                SongSearch.songLyrics[id] = SongSearch._extractLyrics(data.results.slides);
                callback_fn();
              }

            }
          );
        }

        setTimeout(getSongText, 200); // Wait for server response
      }
    );
  },
  _extractLyrics: function(slide){
    var text = "";
    slide.forEach(function(elem,idx){
      text += elem.text + "\n";
    });
    return remove_accents(text).trim();
  },
  search_title: function(str){
    var re = new RegExp(remove_accents(str), "i");
    var matches=[];
    Object.keys(this.songList).forEach(function(key){
      var elem = SongSearch.songList[key];
      var text = remove_accents(""+elem.title+" "+elem.alt);
      if(text.search(re) != -1){
        matches.push(key);
      }
    });

    if(matches.length < 10){
      Object.keys(this.songLyrics).forEach(function(key){
        var elem = SongSearch.songLyrics[key];
        if (!elem){
          return;
        }
        var text = remove_accents(elem); // No es necesario tal vez (si aseguro guardar canciones sin acentos)
        if(text.search(re) != -1){
          matches.push(key);
        }
      });
    }
    return matches;
  },
  search_lyrics: function(str){
    throw "NotImplementedYet";
  },
  persist_data: function(){
    if (typeof(Storage) == "undefined") {
      // Sorry! No Web Storage support..
      alert("No se pueden almacenar las canciones localmente :(");
      return false;
    }

    var json_songList = JSON.stringify(this.songList);
    localStorage.setItem("songList", json_songList);

    var json_songLyrics = JSON.stringify(this.songLyrics);
    localStorage.setItem("songLyrics", json_songLyrics);

    localStorage.setItem("lastUpdate", ""+this.lastUpdate);

    return true;
  },
  fetch_local_data: function(){
    if (typeof(Storage) == "undefined") {
      return false;
    }
    var songList = JSON.parse(localStorage.getItem("songList"));
    songList && (this.songList = songList);

    var songLyrics = JSON.parse(localStorage.getItem("songLyrics"));
    songLyrics && (this.songLyrics = songLyrics);

    var lastUpdate = localStorage.getItem("songLyrics");
    lastUpdate && (this.lastUpdate = Number(lastUpdate));

    return Object.keys(songList).length;
  },
  update_new_songs: function(){
    throw("NotImplementedYet");
  }
};
