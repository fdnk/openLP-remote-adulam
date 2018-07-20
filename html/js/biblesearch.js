/* Bible control Component

Issues with bible search in OpenLP 2.4
---------------------------------------

* Can't fetch bible books data. I can't detect bible laguage neither.
Solution: Save all books data, such book name, abreviation, chapters and
versicle count for each chapter, for each book. This data is stored in
bible_index.json and is language (and maybe version) dependent.
Backdraw: I must check bible version searching one passage of every book.

query() usage example:
  BibleSearch.query("Job 1:1-3,5", function(res){
    if (res.status != success){
      throw("Network error!");
    }
    if (!res.data.length){
      console.log("No matches found!");
    } else {
      console.log(res.data[0]);
    }
  });


*/

window.BibleSearch = {
  books: [],
  getBookList: function(){
    if(!this.books.length){
      throw "BibleSearch:NotInitialized";
    }

    return this.books.map(function(x){
      return x.book;
    });
  },
  getBookChapters: function(book_name){
    if(!this.books.length){
      throw "BibleSearch:NotInitialized";
    }

    return this.books.find(function(elem){
      return elem.book === book_name;
    });
  },
  query: function(query, callback_fn){
    const text = "{\"request\": {\"text\": \"" + query + "\"}}";
    $.getJSON("/api/bibles/search", {"data": text}, function(data, st){
      callback_fn({
        status: "success",
        data: data.results.items
      });
    }).fail(function(jqXHR, textStatus, errorThrown){
      callback_fn({
        status: "failure",
        errorText: textStatus +" "+jqXHR.status+": "+ errorThrown,
        errorData: jqXHR});
    });
  },
  init: function(callback_status){
    $.getJSON("files/js/bible_index.json", function(bible_books,st){
      console.log(""+bible_books.length+" Bible books loaded.");

      window.BibleSearch.query(bible_books[0].book + " 1:1-2,4", function(res){
        if (res.status == "success" && res.data.length){
          // It's working
          window.BibleSearch.books = bible_books;
          callback_status && callback_status({status: "success"});
        }else{
          callback_status && callback_status({status: "failure"});
        }
      });
    }); //$.getJSON
  },
  verify_consistency: function(callback_fn, callback_progress){
    /* Loads bible chapters data from remote JSON
    Tests server bible consistency, searching for <book name> 1:1
    */
    let testedBooks = 0;
    let workingBooks = [];

    $.getJSON("files/js/bible_index.json", function(bible_books,st){
      console.log(""+bible_books.length+" Bible books loaded.");
      //BibleSearch.books = data;

      // Consistency test
      console.log("Testing consistency with server (language mainly)")
      bible_books.forEach(function(book){
        const query = book.book + " 1:1";
        const text = "{\"request\": {\"text\": \"" + query + "\"}}";

        $.getJSON("/api/bibles/search", {"data": text}, function(data, st){
          // Update counters
          testedBooks++;
          callback_progress && callback_progress(testedBooks/bible_books.length);

          // Validate data
          if(data.results.items.length){ // no empty results
            workingBooks.push(book.book);
            if(testedBooks == bible_books.length){ // search done
              // All queryies completed
              if(testedBooks == workingBooks.length){
                console.log("All Bible books loaded successfully :)");
              } else {
                console.log("Error loading Bible books :S");
              }

              // Filter all working books
              let books = bible_books.filter(b => (workingBooks.indexOf(b.book) != -1));

              console.log(""+workingBooks.length + " books ok, "+  books.length+" books loaded.");

              callback_fn && callback_fn({
                status: "success", // Because no network errors ocurried
                book_list: books,
                consistent: (testedBooks == workingBooks.length)
              });
            } // search done
          }else{
            console.log("Book "+book.book +" not working.");
          }
        }).fail(function(jqXHR, textStatus, errorThrown){
          callback_fn && callback_fn({
            status: "failure",
            errorText: textStatus +" "+jqXHR.status+": "+ errorThrown,
            errorData: jqXHR});
        });
      }); //d.forEach
    }).fail(function(jqXHR, textStatus, errorThrown){
      callback_fn && callback_fn({
        status: "failure",
        errorText: textStatus +" "+jqXHR.status+": "+ errorThrown,
        errorData: jqXHR});
    });
  }
};
