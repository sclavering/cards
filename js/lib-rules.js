/*
Standard forms for the various member functions that games need to provide.

Set the member to one of the strings below and BaseCardGame.initialise() will replace it with the
relevant function in this file.
*/

const Rules = {
  autoplay: {
    "commonish":
    function() {
      // suit -> maximum number of that suit that can be autoplayed
      const maxNums = this.getAutoplayableNumbers();
      var triedToFillEmpty = false;
      // numBs matters for Penguin
      const fs = this.foundations, cs = this.allcards;
      const ixs = this.foundationBaseIndexes, numIxs = ixs.length;
      // Try to put Aces (or whatever) on empty foundations.
      const empty = findEmpty(fs); // used to check move legality
      if(empty) {
        for(var j = 0; j != numIxs; ++j) {
          var b = cs[ixs[j]];
          if(!b.pile.isFoundation && b.pile.mayTakeCard(b) && empty.mayAddCard(b))
            return new Move(b, this.getFoundationForAce(b));
        }
      }
      // Now try non-empty foundations
      for(var i = 0; i != fs.length; i++) {
        var f = fs[i];
        if(!f.hasCards) continue;
        var c = f.lastCard.up;
        if(!c || c.number > maxNums[c.suit]) continue;
        if(!c.pile.isFoundation && c.pile.mayTakeCard(c) && f.mayAddCard(c))
          return new Move(c, f);
        // for two-deck games
        c = c.twin;
        if(c && !c.pile.isFoundation && c.pile.mayTakeCard(c) && f.mayAddCard(c))
          return new Move(c, f);
      }
      return null;
    }
  }
};


// Other useful functions for individual games to use

function findEmpty(piles) {
  const num = piles.length;
  for(var i = 0; i != num; i++) {
    var p = piles[i];
    if(!p.hasCards) return p;
  }
  return null;
}
