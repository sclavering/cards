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

dealFromStock:
  "to waste"
  "to waste, can turn stock over"
  "to foundation"
  "to piles"
  "to piles, if none empty"
  "to nonempty piles"

getLowestMovableCard:
  "descending, in suit"
  "descending, alt colours"
  "face up"

hasBeenWon:
  "13 cards on each foundation"

getBestMoveForCard
  "to up or nearest space"
  "down and same suit, or down, or empty"

autoplayMove
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

    "13 cards":
    function(card) {
      if(this.hasChildNodes()) return false;
      var i = card.parentNode.childNodes.length - 13;
      return (i >= 0 && card.parentNode.childNodes[i]==card);
    },

    "king->ace flush":
    function(card) {
      if(this.hasChildNodes()) return false;
      if(!card.isKing || !card.parentNode.lastChild.isAce) return false;
      var next = card.nextSibling;
      while(next && card.suit==next.suit && card.number==next.upNumber) card = next, next = next.nextSibling;
      return !next; // all cards should be part of the run
    }
  },


  dealFromStock: {
    "to waste": function() {
      if(this.stock.hasChildNodes()) this.doAction(new DealFromStockToPileAction(this.waste));
    },

    "to waste, can turn stock over": function() {
      if(this.stock.hasChildNodes()) this.doAction(new DealFromStockToPileAction(this.waste));
      else this.doAction(new TurnStockOverAction());
    },

    "to foundation": function() {
      if(this.stock.hasChildNodes()) this.doAction(new DealFromStockToPileAction(this.foundation));
    },

    "to piles": function() {
      if(!this.stock.hasChildNodes()) return;
      this.doAction(new DealToPilesAction(this.piles));
    },

    "to piles, if none empty": function() {
      if(!this.stock.hasChildNodes()) return;
      for(var i = 0; i != Game.piles.length; i++) if(!Game.piles[i].hasChildNodes()) return;
      this.doAction(new DealToPilesAction(this.piles));
    },

    "to nonempty piles": function() {
      this.doAction(new DealToNonEmptyPilesAction());
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


  hasBeenWon: {
    "13 cards on each foundation":
    function() {
      var fs = this.foundations;
      for(var i = 0; i != fs.length; i++) if(fs[i].childNodes.length!=13) return false;
      return true;
    }
  },


  getBestMoveForCard: {
    "to up or nearest space":
    function(card) {
      var up = card.up, upp = up && up.parentNode, p = card.parentNode;
      if(up && up.faceUp && upp.isNormalPile && upp!=p && !up.nextSibling) return up.parentNode;
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
        if(!p.mayAddCard(card)) continue;
        if(card.suit==p.lastChild.suit) return p;
        if(!maybe) maybe = p;
      }
      return maybe || empty;
    },

    "legal nonempty, or empty":
    function(card) {
      var p = card.parentNode, ps = p.isNormalPile ? p.surrounding : this.piles, num = ps.length;
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
      var p = card.parentNode, ps = p.isNormalPile ? p.surrounding : this.piles, num = ps.length;
      var empty = null;
      for(var i = 0; i != num; i++) {
        p = ps[i];
        if(p.mayAddCard(card)) return p;
      }
      return null;
    }
  },


  autoplayMove: {
    // To use this games must have 4 foundations, built one card at a time, starting with those cards
    // in foundationBases[], and continuing with the unique |up| member of each card.
    // Cards' mayAutoplay field can be overridden with a getter function if needed.
    // xxx the .faceUp checks are redundant with the !.nextSibling ones at present
    // Note: moveTo can fail (and return false) in FreeCell (and similar games)
    "commonish":
    function() {
      var triedToFillEmpty = false;
      const fs = this.foundations, bs = this.foundationBases;
      for(var i = 0; i != 4; i++) {
        var f = fs[i];
        if(f.hasChildNodes()) {
          var c = f.lastChild.up;
          if(c && c.faceUp && !c.nextSibling && c.mayAutoplay) return this.moveTo(c, f);
        } else if(!triedToFillEmpty) {
          triedToFillEmpty = true;
          for(var j = 0; j != 4; j++) {
            var b = bs[j];
            if(b.faceUp && !b.parentNode.isFoundation && b.faceUp && !b.nextSibling) return this.moveTo(b, f);
          }
        }
      }
      return false;
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
          if((cp.isNormalPile || cp.isWaste) && !c.nextSibling) {
            if(c.mayAutoplay) return this.moveTo(c, f);
            continue; // mayAutoplay will also be false for the twin
          } else {
            c = c.twin, cp = c.parentNode;
            if((cp.isNormalPile || cp.isWaste) && !c.nextSibling && c.mayAutoplay) return this.moveTo(c, f);
          }
        } else if(!lookedForAces) {
          lookedForAces = true;
          for(var j = 0; j != 8; j++) {
            var a = as[j], ap = a.parentNode;
            if((ap.isNormalPile || ap.isWaste) && !a.nextSibling) return this.moveTo(a, f);
          }
        }
      }
      return false;
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
