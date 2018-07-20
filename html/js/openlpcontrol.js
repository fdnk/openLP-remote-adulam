window.OpenLP = {
  _escapeId: function(id){
    return (typeof id === "number") ? id : ("\"" + id + "\"");
  },
  setSlide: function(id, component, callback_fn){
    /* Sets a new song, bible, image, service o whatever in server.
    Usage:
    >> OpenLP.setSlide(0,"service",console.log);
    >> OpenLP.setSlide("Job 2:2-4,5","bibles",console.log);
    >> OpenLP.setSlide(2,"songs",console.log);
    */

    // I can't get /api/*/live callbak, so I'll detect if slide id changes
    this.getSlide(function(data, st){  // Get current slide id
      const prev_id = data.results.item; // id changes when the slide is re-setted, don't care
      let server_iterations = 0;

      // Set new slide
      const text = "{\"request\": {\"id\": " + window.OpenLP._escapeId(id) + "}}";
      let api_set_uri = (component==="service")? "/api/service/set" : ("/api/"+component+"/live");
      $.getJSON(api_set_uri, {"data": text}); // Callback doesn't work

      // As the callback isn't working I must ping server until new id is returned
      function checkSlideChange(){
        this.getSlide(function(data, st){
          console.log("previous slide id: " + prev_id + "\ncurrent: " + data.results.item);
          if(data.results.item === prev_id){
            // Slide not changed yet
            if(server_iterations++ >= 10){
              //throw "OpenLP doesn't response";
              callback_fn && callback_fn({}, "failure");
            } else {
              // Wait and check for id change
              setTimeout(checkSlideChange, 200);
            }
          } else {
            // Pass data to external function
            //$.getJSON("/api/display/show"); //Show song -- NOPE, I WILL TURN ON MONITOR, NOT YOU
            callback_fn && callback_fn(data, st);
          }
        }).fail(function(){
          callback_fn && callback_fn({},"failure");
        }); //end getJSON
      } //checkSlideChange
      setTimeout(checkSlideChange, 200); // Wait for server response
    }).fail(function(){
      callback_fn && callback_fn({},"failure");
    }); //end getJSON
  }, //end setSlide() method

  getSlide: function(callback_fn){
    $.getJSON("/api/controller/live/text", callback_fn);
  },

  addToService: function(id, component, callback_fn){
    let prev_service_len = -1;
    let server_iterations = 0;

    this.getService(function(data, st){
      prev_service_len = data.results.items.length;

      const text = "{\"request\": {\"id\": " + id + "}}";
      $.getJSON("/api/" + component + "/add", {"data": text});

      function checkServiceChange(){
        OpenLP.getService(function(data, st){
          if (data.results.items.length === prev_service_len){
            if(server_iterations++ >= 10){
              callback_fn && callback_fn({}, "failure");
            } else {
              // Wait and check for id change
              setTimeout(checkServiceChange, 200);
            }
          } else {
            callback_fn && callback_fn(data, st);
          }

        });
      }
      setTimeout(checkServiceChange, 200); // Wait for server response
    });
  },

  getService: function(callback_fn){
    $.getJSON("/api/service/list", callback_fn);
  },

  setItem: function(id, callback_fn){
    /* Set the Item number id from the current Slide
    Usage:
    >> OpenLP.setItem(0, console.log);
    */
    var text = "{\"request\": {\"id\": " + id + "}}";
    $.getJSON("/api/controller/live/set",  {"data": text},
      function (data, st) {
        callback_fn && callback_fn(data, st);
      }
    ).fail(function(){
      callback_fn && callback_fn({}, "failure");
    });
  },

  getSearchablePlugins: function(callback_fn){
    $.getJSON("/api/plugin/search",function (data, st) {
      callback_fn && callback_fn(data, st);
    }).fail(function(){
      callback_fn && callback_fn({}, "failure");
    });
  },

  search: function(query, component, callback_fn){
    const text = "{\"request\": {\"text\": \"" + query + "\"}}";
    $.getJSON("/api/" + component + "/search", {"data": text},
      function (data, st) {
        callback_fn && callback_fn(data, st);
      }
    ).fail(function(){
      callback_fn && callback_fn({}, "failure");
    });
  },

  pollServer: function(callback_fn){
    $.getJSON("/api/poll", function (data, st) {
      callback_fn && callback_fn(data, st);
    }).fail(function(){
      callback_fn && callback_fn({}, "failure");
    });
  },

  showAlert: function(msg, callback_fn){
    const text = "{\"request\": {\"text\": \"" + msg + "\"}}";
    $.getJSON("/api/alert", {"data": text},
      function (data, status) {
        callback_fn && callback_fn(data, status);
      }
    ).fail(function(){
      callback_fn && callback_fn({}, "failure");
    });
  },

  setDisplay: function(mode, callback_fn){
    /* Valid modes:
    "blank", "theme", "desktop", "show"
    */

    $.getJSON("/api/display/" + mode,
      function (data, status) {
        callback_fn && callback_fn(data, status);
      }
    ).fail(function(){
      callback_fn && callback_fn({}, "failure");
    });
  }

};

/////// LEGACY CODE /////////
window.OpenLPControl = {
  setSong: function(id, callback_ok, callback_err){
    // Sets new song in server and pass slides text and song id to callback_ok()

    $.getJSON( // Get current item id
      "/api/controller/live/text",
      function cb(data, st){
        var prev_song_id = data.results.item; // id changes when the song is re-setted

        var server_iterations = 0;
        // Set new song
        var text = "{\"request\": {\"id\": " + id + "}}";
        $.getJSON("/api/songs/live", {"data": text}); // Callback doesn't work

        // As the callback isn't working I must ping server until new id is returned
        function getSongText(){
          $.getJSON(
            "/api/controller/live/text",
            function cb(data, st){
              console.log("prev id: " + prev_song_id + "\ncurrent: " + data.results.item);
              if(data.results.item == prev_song_id){
                // Song not changed yet
                if(server_iterations++ >= 10){
                  //throw "OpenLP doesn't response";
                  callback_err();
                }
                setTimeout(getSongText, 200);
              } else {
                // Pass data to external function
                $.getJSON("/api/display/show"); //Show song
                callback_ok(data);
              }
            }
          ); //getJSON
        } //getSongText
        setTimeout(getSongText, 200); // Wait for server response
      }
    );//getJSON
  } //end setSong() method
};
