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
    const verses = Number($('.bookopt').filter('option:selected').val());
    console.log(chapter, verses);
    let options = [];
    for (let i=0; i < verses; i++){
      options.push("<option>" + i + "</option>");
    }
    $(".selectpicker.verseSelector").html(options);
    $(".selectpicker.verseSelector").selectpicker('refresh');
  },
  selectVerseEvent(){
    // Clear Modal
    $("#bibleModal-panel > .list-group").empty();
    console.log(""+ $(".selectpicker.bookSelector").val() + " "+
      $(".selectpicker.chapterSelector").val() + ":"+ $(".selectpicker.verseSelector").val() );
  },
  addVerse: function(id, text){
    // use: addVerse("Job 7:32", "verse text goes here\nAnd newlines too.");
    const rEx = /(?:\d+):(\d+)/;
    const match = rEx.exec(id);

    const verse = match ? ("<sup>["+match[1]+"]</sup>"):"";
    $("#bibleModal-panel > .list-group").append('<li class="list-group-item" data-slide=' + id + '>' + verse + text + '</li>');
  }
}


/****************** DOM Related ******************/
window.Remote={
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
  loadBibleData: function(){
    //nothing yet
    BibleSearch.books.forEach(function(elem){
      $("#bibBookList").append(
        "<li class=\"list-group-item d-flex justify-content-between align-items-center\" data-book=\""+elem.book+"\">"+ elem.book
        + "<span class=\"badge badge-primary badge-pill\">"+elem.chapters.length+"</span></li>");
      });

      // Trigger
      $("#bibBookList > .list-group-item").click(function(){
        const book = $(this).data("book");
        //Remote.filterBibleBooks(book); // Remove another books
        Remote.selectBibleBook(book);
        setTimeout(function(){
          $("#capitulo-tab").tab('show'); // Goes to next tab
        }, 250);
      });
  },

  filterBibleBooks: function(name){
    // Search for incomplete book name
    const re = new RegExp(remove_accents(name), "i");

    // jQuery don't regexp, so will I
    BibleSearch.books.forEach(function(elem){
      if (remove_accents(elem.book).search(re)!=-1){
        // Show
        $('*[data-book="'+elem.book+'"]').removeClass("d-none");
        $('*[data-book="'+elem.book+'"]').addClass("d-flex");
      }else{
        // Hide
        $('*[data-book="'+elem.book+'"]').addClass("d-none");
        $('*[data-book="'+elem.book+'"]').removeClass("d-flex");
      }
    });
  },

  selectBibleBook(name){
    // Recives a correct book name and activate only this <li>
    $('#bibBookList > :not(*[data-book="'+name+'"])').removeClass("active"); // deactivate anothers
    $('#bibBookList > *[data-book="'+name+'"]').addClass("active"); // activate

    // Adds chapters and versicles list
    const book = BibleSearch.books.filter(elem => (elem.book===name))[0];
    let cod = '<div class="row">';
    book.chapters.forEach(function(x){
      cod += '<div id="botoneraCap" class="col-2" style="padding-top: 100%;"><button type="button" class="btn btn-outline-primary btn-lg btn-block rounded-circle" data-chap="'+x.chapter+'">'+x.chapter+'</button></div>';
    });
    cod += '</div>'
    $("#capitulo-tabcontent").empty();
    $("#capitulo-tabcontent").append('<div class="mybtn-grid d-flex" role="group">'+cod+'</div>');
    $("#botoneraCap > .btn").click(function(evt){
      console.log($(this).data("chap"));
      $("#botoneraCap > .btn").removeClass("active");
      $(this).addClass("active");
      Remote.selectBibleChapter(name, $(this).data("chap"));
      setTimeout(function(){
        $("#versiculo-tab").tab('show'); // Goes to next tab
      },250);
    });
  },

  selectBibleChapter(name, chap){
    // Recives a correct book anda chapter name

    // Adds versicles list
    const book = BibleSearch.books.filter(elem => (elem.book===name))[0];
    const chaps = book.chapters.filter( v => (v.chapter==chap));
    const n_verses = Number(chaps[0].verses);
    const verselist = Array.from({length: n_verses}, (v, k) => k+1);
    console.log(verselist)
    let cod = '<div class="row">';
    verselist.forEach(function(x){
      cod += '<div id="botoneraVers" class="col-2" style="padding-top: 100%;"><button type="button" class="btn btn-outline-primary btn-lg btn-block rounded-circle" data-vers="'+x+'">'+x+'</button></div>';
    });
    cod += '</div>'
    $("#versiculo-tabcontent").empty();
    $("#versiculo-tabcontent").append('<div class="mybtn-grid d-flex" role="group">'+cod+'</div>');
    $("#botoneraVers > .btn").click(function(evt){
      console.log($(this).data("vers"));
      $(this).toggleClass("active");
    });  ////// TODO: Agregar boton de ok al modal
  },

  bibleModalShowTrigger(){
    $("#searchBook").val("");
    this.filterBibleBooks("");
  }
}
