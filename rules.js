/*
Standard forms for the various member functions that games need to provide.

Set the member to one of the strings below and BaseCardGame.initialise() will replace it with the
relevant function in this file.

Current choices:

getLowestMovableCard:
  "descending, in suit"
  "descending, alt colours"
  "face up"

isWon:
  "13 cards on each foundation"
  "foundation holds all cards"

getBestDestinationFor
  "to up or nearest space"
  "down and same suit, or down, or empty"

autoplay
  "commonish"
  "commonish 2deck"
*/

var Rules = {
  getLowestMovableCard: {
    "descending, in suit":
    function(pile) {
      if(!pile.hasChildNodes()) return null;
      var card = pile.lastChild, prv = card.previousSibling;
      while(prv && prv.faceUp && prv.number==card.upNumber && prv.suit==card.suit) {
        card = prv; prv = card.previousSibling;
      }
      return card;
    },

    "descending, alt colours":
    function(pile) {
      if(!pile.hasChildNodes()) return null;
      var card = pile.lastChild, prv = card.previousSibling;
      while(prv && prv.faceUp && prv.number==card.upNumber && prv.colour!=card.colour) {
        card = prv; prv = card.previousSibling;
      }
      return card;
    },

    "face up":
    function(pile) {
      if(!pile.hasChildNodes()) return null;
      var card = pile.lastChild, prv = card.previousSibling;
      while(prv && prv.faceUp) card = prv, prv = card.previousSibling;
      return card;
    }
  },


  isWon: {
    "13 cards on each foundation":
    function() {
      const fs = this.foundations, num = fs.length;
      for(var i = 0; i != num; i++) if(fs[i].childNodes.length!=13) return false;
      return true;
    },

    "26 cards on each foundation":
    function() {
      const fs = this.foundations, num = fs.length;
      for(var i = 0; i != num; i++) if(fs[i].childNodes.length!=26) return false;
      return true;
    },

    "foundation holds all cards":
    function() {
      return this.foundation.childNodes.length==this.cards.length;
    }
  },


  getBestDestinationFor: {
    "to up or nearest space":
    function(card) {
      const up = card.up, upp = up && up.parentNode;
      if(upp && upp.mayAddCard(card)) return upp;
      const e = findEmpty(card.parentNode.surrounding);
      return e && e.mayAddCard(card) ? e : null;
    },

    "down and same suit, or down, or empty":
    function(card) {
      const ps = card.parentNode.surrounding, num = ps.length;
      var maybe = null, empty = null;
      for(var i = 0; i != num; i++) {
        var p = ps[i], last = p.lastChild;
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
      var p = card.parentNode, ps = p.isPile ? p.surrounding : this.piles, num = ps.length;
      var empty = null;
      for(var i = 0; i != num; i++) {
        p = ps[i];
        if(p.hasChildNodes()) {
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
      var p = card.parentNode, ps = p.isPile ? p.surrounding : this.piles, num = ps.length;
      var empty = null;
      for(var i = 0; i != num; i++) {
        p = ps[i];
        if(p.mayAddCard(card)) return p;
      }
      return null;
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
        if(f.hasChildNodes()) {
          var c = f.lastChild.up;
          if(c && c.faceUp && !c.nextSibling && c.number <= maxNums[c.suit])
            return new Move(c, f);
        } else if(!triedToFillEmpty) {
          triedToFillEmpty = true;
          for(var j = 0; j != numBs; j++) {
            var b = bs[j];
            if(b.faceUp && !b.parentNode.isFoundation && b.faceUp && !b.nextSibling)
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
        var f = fs[i], last = f.lastChild;
        if(last) {
          if(last.isKing) continue;
          var c = last.up, cp = c.parentNode;
          if(!cp.isFoundation && !cp.isStock && !c.nextSibling) {
            if(c.number <= maxNums[c.suit]) return new Move(c, f);
            continue;
          } else {
            c = c.twin, cp = c.parentNode;
            if(!cp.isFoundation && !cp.isStock && !c.nextSibling && c.number<=maxNums[c.suit])
              return new Move(c, f);
          }
        } else if(!lookedForAces) {
          lookedForAces = true;
          for(var j = 0; j != 8; j++) {
            var a = as[j], ap = a.parentNode;
            if(!ap.isFoundation && !ap.isStock && !a.nextSibling)
              return new Move(a, f)
          }
        }
      }
      return null;
    }
  },

  // returns a suit -> number map
  getAutoplayableNumbers: {
    // can play 5H if 4C and 4S played.  can play any Ace or 2
    "klondike": function() {
      const fs = this.foundations;
      const colournums = [1000, 1000]; // colour -> smallest num of that colour on fs
      const colourcounts = [0, 0]; // num of foundation of a given colour
      for(var i = 0; i != 4; ++i) {
        var c = fs[i].lastChild;
        if(!c) continue;
        var col = c.colour, num = c.number;
        colourcounts[col]++;
        if(colournums[col] > num) colournums[col] = num;
      }
      if(colourcounts[0] < 2) colournums[0] = 1;
      if(colourcounts[1] < 2) colournums[1] = 1;
      // suit -> num map
      const rednum = colournums[RED] + 1, blacknum = colournums[BLACK] + 1;
//      dump("decided can move red "+blacknum+"s and black "+rednum+"s\n");
      return [, rednum, blacknum, blacknum, rednum];
    },

    "any": function() {
      return [,13,13,13,13];
    },

    gypsy: function() {
      const fs = this.foundations;
      const nums = [20,20], counts = [0,0]; // colour -> foo maps
      for(var i = 0; i != 8; ++i) {
        var c = fs[i].lastChild;
        if(!c) continue;
        var colour = c.colour, num = c.number;
        counts[colour]++;
        if(nums[colour] > num) nums[colour] = num;
      }
      if(counts[0] != 4) nums[0] = 0;
      if(counts[1] != 4) nums[1] = 0;
      const black = nums[RED] + 1, red = nums[BLACK] + 1;
      return [,black,red,red,black];
    }
  }
}



// Other useful functions for individual games to use

function findEmpty(piles) {
  const num = piles.length;
  for(var i = 0; i != num; i++) {
    var p = piles[i];
    if(!p.hasChildNodes()) return p;
  }
  return null;
}
