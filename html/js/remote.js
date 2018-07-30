window.SearchCards = {
  // JS for DOM Cards management

  setCards: function (cards){
    // cards = [ {title:"titulo", content:"", id:nro}, {...}, ..., {...}  ]

    // Remove all cards
    $("#accordion > .card").remove();

    // Add new cards
    cards.forEach(function callback(elem, id){
      SearchCards.setCard(elem, id);
    });
  },

  setCard: function (elem, id){
    // Search for a existent cardN
    if(! $("#card"+id).length){
      // Card doesn't exist
      this.appendCard(id);
    }

    // Card now exists, set values
    $("#card"+ id + " > h5 > button").text(elem.title);
    $("#collapse1 > .card-body ".replace(/1/g,id)).text(elem.content);
    $("#collapse1 > .card-body ".replace(/1/g,id)).click(function(){
      Remote.setSong(elem.id);
    });
  },

  appendCard: function (N){
    $("#accordion").append('<div class="card">\
      <div class="card-header" id="card1">\
        <h5 class="mb-0">\
          <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse1" aria-expanded="false" aria-controls="collapse1">\
            Title\
          </button>\
        </h5>\
      </div>\
      <div id="collapse1" class="collapse" aria-labelledby="heading1" data-parent="#accordion">\
        <div class="card-body" style="cursor: pointer;">\
          Text\
        </div>\
      </div>\
    </div>'.replace(/1/g, N));
  }
}


/****************** Bible DOM ******************/
window.BibleSelector = {
  init: function(){
    // Load books
    BibleSearch.init(function(data){
      x = data;
      if(data && data.status != "success"){
        $("#bibleModal-panel > .list-group").html("<h3>Error cargando Biblia</h3>");
        return;
      }

      let options = [];
      BibleSearch.getBookList().forEach(function(book){
        options.push("<option>" + book + "</option>");
      });
      $(".selectpicker.bookSelector").html(options);
      $(".selectpicker.bookSelector").selectpicker('refresh');
    });
  },

/////////// UI Listeners ///////////
  selectBookEvent: function(){
    // A book is selected. Load chapters
    const book = $(".selectpicker.bookSelector").val();
    let options = [];
    window.BibleSearch.getBookChapters(book).chapters.forEach(function(obj){
      options.push("<option class='bookopt' data-verses='" + obj.verses + "'>" + obj.chapter + "</option>")
    });
    $(".selectpicker.chapterSelector").html(options);
    $(".selectpicker.chapterSelector").selectpicker('refresh');
  },

  selectChapterEvent(){
    // A chapter is selected, Load verses
    const chapter = $(".selectpicker.chapterSelector").val();
    if (!chapter){
      throw("No chapter selected");
    }
    const verses = Number($('.bookopt').filter('option:selected').data('verses'));
    console.log(chapter, verses);
    let options = [];
    for (let i=1; i <= verses; i++){
      options.push("<option>" + i + "</option>");
    }
    $(".selectpicker.verseSelector").html(options);
    $(".selectpicker.verseSelector").selectpicker('refresh');
  },
  selectVerseEvent(){
    // Clear Modal
    const lastVerse = Number($('.bookopt').filter('option:selected').data('verses'));
    const verse = Number($(".selectpicker.verseSelector").val());
    const chapter = Number($(".selectpicker.chapterSelector").val());
    const book = $(".selectpicker.bookSelector").val()

    if(!verse || !chapter){
      throw("No chapter or verse selected");
    }
    // Clear verse list
    $("#verse-tab").empty()
    // Add verses
    BibleSelector.addVerses(book, chapter, verse, lastVerse, "active");
  },

/////////// UI Listeners ///////////
  addVerses: function(book, chapter, first, last, active){
    // Add the verses "book chapter:first-last" to the modal secuentially
    first = Number(first); // security reasons
    if (!last){
      const last = first;
    }

    // Break condition
    if (first > last){
      return;
    }

    const ref = ""+ book + " "+ chapter + ":"+ first;
    BibleSearch.query(ref, function(data){
      if (data.status != "success"){
        throw("Bible query: failure.");
      }

      const text = data.data[0][1].trim();
      BibleSelector.addItem(ref, text, active);
      // Add next verse
      BibleSelector.addVerses(book, chapter, Number(first)+1, last);
    });
  },
  addItem: function(id, text, active){
    // Add an item (a versicle) to the modal. The id and the text must be proporioned
    // if active == true, the verse is selected
    // use: addVerse("Job 7:32", "verse text goes here\nAnd newlines too.");
    const rEx = /(?:\d+):(\d+)/;
    const match = rEx.exec(id);

    console.log("Add "+id+" | "+text);
    m = id;
    const verse = match ? ("<sup>["+match[1]+"]</sup>"):"";
    const html = '<a class="list-group-item list-group-item-action" data-toggle="list" href="#" role="tab" data-slide="' + id + '">' + verse + text + '</a>'
    $("#bibleModal-panel > .list-group").append(html);
    if(active){
      $("#bibleModal-panel > .list-group > .list-group-item").filter('[data-slide="' + id + '"]').tab("show").trigger("click");
    }
  },
  displayVerse: function(id){
    OpenLP.setSlide(id, "bibles", console.log);
  },
  moveChapter: function(n){
    const current = Number($(".selectpicker.chapterSelector").val());

    $(".selectpicker.chapterSelector").val(String(current+n)).selectpicker("refresh");
    BibleSelector.selectChapterEvent();
    $(".selectpicker.verseSelector").val("1").selectpicker("refresh");
    BibleSelector.selectVerseEvent();
  }
}


/****************** DOM Related ******************/
window.Remote={
  pluginIcons: {
    "songs":"fas fa-music",
    "bibles":"fas fa-book",
    "images":"fas fa-image",
    "custom":"fas fa-question-circle",
    "media":"fas fa-video",
    "presentations":"fas fa-pen-square"
  },

  // Methods
  show_results: function (results){
    // cards = [ {title:"titulo", content:"", id:nro}...]
    var cards = results.map(function(key){
      var song = SongSearch.songList[key];
      var title = song.title + (song.alt?" ("+song.alt+")":"");
      return {title: title, content: SongSearch.songLyrics[key], id:key};
    });

    SearchCards.setCards(cards);
  },

  goSearch: function (){
    // Search text in title
    var results = SongSearch.search_title( $("#searchText").val() );
    this.show_results(results);

    // Search text in song lyrics
    //(fuzzy search maybe? show first 10 results in another color if title results are few)
    // TODO
  },

  cancelSearch: function (){
    $("#searchText").val("");
    $("#accordion > .card").remove();
    $("#cancelSearch").toggle(false);
  },

  setSong: function (key){
    this.cancelSearch();
    console.log("set song: "+key);
    OpenLP.setSlide(key, "songs", function(data, st){
      if (st == "success"){
        window.Remote.loadSlides(data);
        window.OpenLP.setDisplay("show");
      } else {
        console.log("Error loading song");
        throw "Error loading song";
      }
    });
    /* Launch song. Option:
      - Unclosable modal
      - Page body (close search results with X button) <--- i think
    */
  },

  loadSlides: function(data){
    // Modifies DOM adding slides and triggers
    $("#songPanel > .list-group").remove();
    $("#songPanel").append('<ul class="list-group" data-song_id="'+ data.results.item +'"/>');

    data.results.slides.forEach(function(elem, idx){ // ¿Must I sanitize?
      $("#songPanel > .list-group").append('<li class="list-group-item" data-slide='+idx+'>'+elem.html+'</li>');
    });

    // Add triggers
    $("#songPanel > .list-group > .list-group-item").click(function(e){
      console.log("click");
      Remote.setSlide($(this).data("slide"));
      // Center on slide
      self=this;
      $('html,body').animate({
        scrollTop: $(this).offset().top - $(window).height()/2
      }, 500);
    });
  },

  setSlide: function(id){
    console.log("set slide: "+id);
    var text = "{\"request\": {\"id\": " + id + "}}";
    $.getJSON(
      "/api/controller/live/set",
      {"data": text},
      function (data, status) {
        //?
      }
    );
  },

  updateDOM: function(){
    // request status
    OpenLP.pollServer(function(data){
      var current_song = $("#songPanel > .list-group").data("song_id");

      if (current_song == data.results.item){
        var slide = data.results.slide;
        // Current song is the song. Update active slide
        $('*[data-slide="'+slide+'"]').addClass("active");
        // I must deactivate all another items
        $("#songPanel > .list-group > .list-group-item").not('*[data-slide="'+slide+'"]').removeClass("active");
      }else{
        // I must update the song
        $.getJSON("/api/controller/live/text", function(data){//////////////////HERE
          Remote.loadSlides(data);
        });
      }

    });
  },

  //// Service Modal
  serviceModalFocus: function(){
    $("#service-tab").empty();
    OpenLP.getService(function(x){
      if(x.results.items){
        x.results.items.forEach(function(item, num){
          xx=item;
          const id = item.id;
          const text = item.title;
          let icon;
          try {
            icon = Remote.pluginIcons[item.plugin];
          }
          catch(e){
            icon = Remote.pluginIcons["custom"];
          }

          const isactive = item.selected? "active":"";
          const icon_html = '<i class="' + icon + ' mr-2"></i> ';
          const html = '<a class="list-group-item list-group-item-action ' + isactive + '" data-toggle="list" href="#" role="tab" data-id="' + id + '" data-num="' + num + '">' + icon_html + text + '</a>'
          $("#service-tab").append(html);
        });
      }else{
        $("#service-tab").append("No hay nada para mostrar aquí.");
      }
    });

  }
}
