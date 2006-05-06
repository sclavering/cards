/*
Standard forms for the various member functions that games need to provide.

Set the member to one of the strings below and BaseCardGame.initialise() will replace it with the
relevant function in this file.
*/

const Rules = {
  getLowestMovableCard_helper: {
    "descending, in suit": function(card, prv) {
      return prv.faceUp && card.upNumber == prv.number && card.suit == prv.suit;
    },
    "descending, alt colours": function(card, prv) {
      return prv.faceUp && card.upNumber == prv.number && card.colour != prv.colour;
    },
    "face up": function(card, prv) {
      return prv.faceUp;
    }
  },


  isWon: {
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
      return this.foundation.cards.length == this.cards.length;
    }
  },


  getBestDestinationFor: {
    "to up or nearest space":
    function(card) {
      const up = card.up, upp = up && up.pile;
      if(upp && upp.mayAddCard(card)) return upp;
      const e = findEmpty(card.pile.surrounding);
      return e && e.mayAddCard(card) ? e : null;
    },

    "down and same suit, or down, or empty":
    function(card) {
      const ps = card.pile.surrounding, num = ps.length;
      var maybe = null, empty = null;
      for(var i = 0; i != num; i++) {
        var p = ps[i], last = p.lastCard;
        if(!last) {
          if(!empty) empty = p;
          continue;
        }
        if(card.upNumber!=last.number) continue;
        if(card.suit==last.suit) return p;
        if(!maybe) maybe = p;
      }
      return maybe || empty;
    },

    "legal nonempty, or empty":
    function(card) {
      var p = card.pile, ps = p.isPile ? p.surrounding : this.piles, num = ps.length;
      var empty = null;
      for(var i = 0; i != num; i++) {
        p = ps[i];
        if(p.hasCards) {
          if(p.mayAddCard(card)) return p;
        } else if(!empty) {
          empty = p;
        }
      }
      // the check is essential in Forty Thieves, and won't matter much elsewhere
      return empty && empty.mayAddCard(card) ? empty : null;
    },

    "legal":
    function(card) {
      var p = card.pile, ps = p.isPile ? p.surrounding : this.piles, num = ps.length;
      var empty = null;
      for(var i = 0; i != num; i++) {
        p = ps[i];
        if(p.mayAddCard(card)) return p;
      }
      return null;
    },

    "towers/penguin":
    function(card) {
      if(card.isKing) {
        const p = card.pile, pile = p.isPile ? findEmpty(p.surrounding) : this.firstEmptyPile;
        if(pile && pile.mayAddCard(card)) return pile;
      } else {
        const up = card.up, upp = up.pile;
        if(upp.isPile && up.isLast && upp.mayAddCard(card)) return upp;
      }
      return card.isLast ? this.emptyCell : null;
    }
  },


  autoplay: {
    "commonish":
    function() {
      // suit -> maximum number of that suit that can be autoplayed
      const maxNums = this.getAutoplayableNumbers();
      var triedToFillEmpty = false;
      // numBs matters for Penguin
      const fs = this.foundations, bs = this.foundationBases, numBs = bs.length;
      for(var i = 0; i != 4; i++) {
        var f = fs[i];
        if(f.hasCards) {
          var c = f.lastCard.up;
          if(c && c.faceUp && c.isLast && c.number <= maxNums[c.suit])
            return new Move(c, f);
        } else if(!triedToFillEmpty) {
          triedToFillEmpty = true;
          for(var j = 0; j != numBs; j++) {
            var b = bs[j];
            if(b.faceUp && !b.pile.isFoundation && b.faceUp && b.isLast)
              return new Move(b, f);
          }
        }
      }
      return null;
    },

    // like above, but for 2 decks
    "commonish 2deck":
    function() {
      const fs = this.foundations, as = this.foundationBases;
      const maxNums = this.getAutoplayableNumbers();

      var lookedForAces = false;
      for(var i = 0; i != 8; i++) {
        var f = fs[i], last = f.lastCard;
        if(last) {
          if(last.isKing) continue;
          var c = last.up, cp = c.pile;
          if(!cp.isFoundation && !cp.isStock && c.isLast) {
            if(c.number <= maxNums[c.suit]) return new Move(c, f);
            continue;
          } else {
            c = c.twin, cp = c.pile;
            if(!cp.isFoundation && !cp.isStock && c.isLast && c.number <= maxNums[c.suit])
              return new Move(c, f);
          }
        } else if(!lookedForAces) {
          lookedForAces = true;
          for(var j = 0; j != 8; j++) {
            var a = as[j], ap = a.pile;
            if(!ap.isFoundation && !ap.isStock && a.isLast)
              return new Move(a, f)
          }
        }
      }
      return null;
    }
  },

  // returns a suit -> number map
  // If result.S = x then any spade with rank >=x may be autoplayed
  getAutoplayableNumbers: {
    // can play 5H if 4C and 4S played.  can play any Ace or 2
    "klondike": function() {
      const fs = this.foundations;
      const colournums = { R: 1000, B: 1000 }; // colour -> smallest num of that colour on fs
      const colourcounts = { R: 0, B: 0 }; // num of foundation of a given colour
      for(var i = 0; i != 4; ++i) {
        var c = fs[i].lastCard;
        if(!c) continue;
        var col = c.colour, num = c.number;
        colourcounts[col]++;
        if(colournums[col] > num) colournums[col] = num;
      }
      if(colourcounts.R < 2) colournums.R = 1;
      if(colourcounts.B < 2) colournums.B = 1;
      const black = colournums.R + 1, red = colournums.B + 1;
      return { S: black, H: red, D: red, C: black };
    },

    "any": function() {
      return { S: 13, H: 13, D: 13, C: 13 };
    },

    gypsy: function() {
      const fs = this.foundations;
      const nums = { R: 20, B: 20 }, counts = { R: 0, B: 0 }; // colour -> foo maps
      for(var i = 0; i != 8; ++i) {
        var c = fs[i].lastCard;
        if(!c) continue;
        var colour = c.colour, num = c.number;
        counts[colour]++;
        if(nums[colour] > num) nums[colour] = num;
      }
      if(counts[0] != 4) nums[0] = 0;
      if(counts[1] != 4) nums[1] = 0;
      const black = nums.R + 1, red = nums.B + 1;
      return { S: black, H: red, D: red, C: black };
    }
  }
}



// Other useful functions for individual games to use

function findEmpty(piles) {
  const num = piles.length;
  for(var i = 0; i != num; i++) {
    var p = piles[i];
    if(!p.hasCards) return p;
  }
  return null;
}
