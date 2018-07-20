//****************** Common lib ******************
function remove_accents(p){
  return p.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
}
