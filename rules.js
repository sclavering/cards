/*
Standard forms for the various member functions that games need to provide.

Set the member to one of the strings below and BaseCardGame.initialise() will replace it with the
relevant function in this file.


Current choices:

mayTakeCard:
(used for mayTakeCardFromWaste, mayTakeCardFromFoundation etc.)
  "yes" - may always take any card from this pile
  "no"  - nay never take any card from this pile
  "single card" - may take the topmost card and no other
  "face up" - may take any card in the pile which is face up
  "run down"
  "run down, alt colours"
  "run down, same suit"

mayAddCard:
(used for mayAddCardToFoundation etc.)
  "yes"
  "no"
  "if empty"

  // for cells
  "single card, if empty"

  // for ordinary piles
  "onto .up"
  "onto .up, kings in spaces"
  "down"
  "down, opposite colour"
  "down and different colour, king in space"

  // for foundations
  "single card, up in suit or ace in space"
  "canfield/penguin"
  "13 cards"
  "king->ace flush"

dealFromStock:
  "to waste"
  "to foundation"
  "to piles"
  "to piles, if none empty"
  "to nonempty piles"

turnStockOver: {
  "no"
  "yes"

getLowestMovableCard:
  "descending, in suit"
  "descending, alt colours"
  "face up"

isWon:
  "13 cards on each foundation"
  "foundation holds all cards"

getBestMoveForCard
  "to up or nearest space"
  "down and same suit, or down, or empty"

autoplay
  "commonish"
  "commonish 2deck"
*/

var Rules = {
  mayTakeCard: {
    "yes":
    function(card) { return true; },

    "no":
    function(card) { return false; },

    // faceUp check may be unnecessary
    "single card":
    function(card) { return !card.nextSibling && card.faceUp; },

    "face up":
    function(card) { return card.faceUp; },

    "run down":
    function(card) {
      if(card.faceDown) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.number!=next.upNumber) return false;
      return true;
    },

    "run down, alt colours":
    function(card) {
      if(card.faceDown) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.colour==next.colour || card.number!=next.upNumber) return false;
      return true;
    },

    "run down, same suit":
    function(card) {
      if(card.faceDown) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.suit!=next.suit || card.number!=next.upNumber) return false;
      return true;
    }
  },


  mayAddCard: {
    "yes": function(card) { return true; },

    "no": function(card) { return false; },

    "if empty":
    function(card) {
      return !card.nextSdibling && !this.hasChildNodes();
    },


    // for cells

    "single card, if empty":
    function(card) {
      return !this.hasChildNodes() && !card.nextSibling;
    },


    // for ordinary piles

    "onto .up":
    function(card) {
      return !this.hasChildNodes() || this.lastChild==card.up;
    },

    "onto .up, kings in spaces":
    function(card) {
      return this.hasChildNodes ? this.lastChild==card.up : card.isKing;
    },

    "down":
    function(card) {
      return !this.hasChildNodes() || this.lastChild.number==card.upNumber;
    },

    "down, opposite colour":
    function(card) {
      var last = this.lastChild;
      return !last || (last.number==card.upNumber && last.colour!=card.colour);
    },

    "down and different colour, king in space":
    function(card) {
      var last = this.lastChild;
      return last ? last.number==card.upNumber && last.colour!=card.colour : card.isKing;
    },

    // for foundations

    "single card, up in suit or ace in space":
    function(card) {
      const last = this.lastChild;
      return !card.nextSibling && (this.hasChildNodes() ? last.suit==card.suit && last.upNumber==card.number : card.isAce);
    },

    // requires .up fields of cards to form circular lists within suits, and defining Game.foundationStartNumber
    "canfield/penguin":
    function(card) {
      if(card.nextSibling) return false;
      return this.hasChildNodes() ? this.lastChild.up==card : card.number==Game.foundationStartNumber;
    },

    "13 cards":
    function(card) {
      const sibs = card.parentNode.childNodes;
      var i = sibs.length - 13;
      return i >= 0 && sibs[i]==card;
    },

    "king->ace flush":
    function(card) {
      if(!card.isKing || !card.parentNode.lastChild.isAce) return false;
      var next = card.nextSibling;
      while(next && card.suit==next.suit && card.number==next.upNumber) card = next, next = next.nextSibling;
      return !next; // all cards should be part of the run
    }
  },


  dealFromStock: {
    "to waste": function() {
      return this.stock.hasChildNodes() ? new DealToPile(this.waste) : null;
    },

    "to foundation": function() {
      return this.stock.hasChildNodes() ? new DealToPile(this.foundation) : null;
    },

    "to piles": function() {
      return this.stock.hasChildNodes() ? new DealToPiles(this.piles) : null;
    },

    "to piles, if none empty": function() {
      if(!this.stock.hasChildNodes()) return null;
      for(var i = 0; i != Game.piles.length; i++) if(!Game.piles[i].hasChildNodes()) return null;
      return new DealToPiles(this.piles);
    },

    "to nonempty piles": function() {
      return new DealToNonEmptyPilesAction();
    }
  },


  turnStockOver: {
    "no": function() {
      return null;
    },
    // only for games with a waste pile
    "yes": function() {
      return new TurnStockOverAction();
    }
  },


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


  getBestMoveForCard: {
    "to up or nearest space":
    function(card) {
      var up = card.up, upp = up && up.parentNode, p = card.parentNode;
      if(up && up.faceUp && upp.isPile && upp!=p && !up.nextSibling) return upp;
      return findEmpty(p.surrounding);
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
      return empty;
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
    // To use this games must have 4 foundations, built one card at a time, starting with those cards
    // in foundationBases[], and continuing with the unique |up| member of each card.
    // Cards' mayAutoplay field can be overridden with a getter function if needed.
    // xxx the .faceUp checks are redundant with the !.nextSibling ones at present
    "commonish":
    function() {
      var triedToFillEmpty = false;
      // numBs matters for Penguin
      const fs = this.foundations, bs = this.foundationBases, numBs = bs.length;
      for(var i = 0; i != 4; i++) {
        var f = fs[i];
        if(f.hasChildNodes()) {
          var c = f.lastChild.up;
          if(c && c.faceUp && !c.nextSibling && c.mayAutoplay)
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
      var lookedForAces = false;
      for(var i = 0; i != 8; i++) {
        var f = fs[i], last = f.lastChild;
        if(last) {
          if(last.isKing) continue;
          var c = last.up, cp = c.parentNode;
          if(!cp.isFoundation && !cp.isStock && !c.nextSibling) {
            if(c.mayAutoplay) return new Move(c, f);
            continue; // mayAutoplay will also be false for the twin
          } else {
            c = c.twin, cp = c.parentNode;
            if(!cp.isFoundation && !cp.isStock && !c.nextSibling && c.mayAutoplay)
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

// these are to be used as mayAutoplay getter functions on cards
function mayAutoplayAfterTwoOthers() {
  return this.autoplayAfterA.parentNode.isFoundation && this.autoplayAfterB.parentNode.isFoundation;
}

function mayAutoplayAfterFourOthers() {
  var a = this.autoplayAfterA, b = this.autoplayAfterB;
  return a.parentNode.isFoundation && a.twin.parentNode.isFoundation
      && b.parentNode.isFoundation && b.twin.parentNode.isFoundation;
}
