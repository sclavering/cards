const isWon = {
  "13 cards on each foundation":
  function() {
    const fs = this.foundations, num = fs.length;
    for(var i = 0; i != num; i++) if(fs[i].cards.length != 13) return false;
    return true;
  },

  "26 cards on each foundation":
  function() {
    const fs = this.foundations, num = fs.length;
    for(var i = 0; i != num; i++) if(fs[i].cards.length != 26) return false;
    return true;
  },

  "foundation holds all cards":
  function() {
    return this.foundation.cards.length == this.allcards.length;
  }
};
