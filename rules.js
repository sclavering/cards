/*
Standard forms for the various member functions that games need to provide.

Set the member to one of the strings below and BaseCardGame.initialise() will replace it with the
relevant function in this file.  e.g. set canMoveCard to "descending".


Current choices:

canMoveCard:
  "descending"
  "descending, not from foundation"
  "descending, alt colours"
  "descending, in suit"
  "descending mod13, in suit, not from foundation":
  "descending, in suit, not from foundation"
  "not from foundation"
  "last on pile"

canMoveToPile:
  "onto up, any in spaces"
  "descending"
  "descending mod13"
  "descending, alt colours, kings in spaces"
  "descending, in suit, kings in spaces"
  "descending, alt colours"
  "descending, same colour"
  "descending, in suit"
  "isempty"

canMoveToFoundation:
  "king->ace flush"
  "13 cards"  (any set of 13 card. canMoveCard will ensure they're a running flush, or whatever)
  "13 cards, if empty" (... and only if the foundation is empty)

dealFromStock:
  "to waste"
  "to waste, can turn stock over"
  "to foundation"
  "to piles"
  "to piles, if none empty"
  "to nonempty piles"

xxx these (c|sh)ould just use the canMoveCard value
getLowestMovableCard:
  "descending, in suit"
  "descending mod13, in suit"
  "descending, alt colours"
  "face up":

hasBeenWon:
  "13 cards on each foundation":

getBestMoveForCard
  "to up or nearest space"

autoplayMove
  "commonish"
*/

var Rules = {
  canMoveCard: {
    "descending":
    function(card) {
      if(card.faceDown) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.number!=next.upNumber) return false;
      return true;
    },

    "descending, not from foundation":
    function(card) {
      if(card.faceDown || card.parentNode.isFoundation) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.number!=next.upNumber) return false;
      return true;
    },

    "descending, alt colours":
    function(card) {
      if(card.faceDown) return false;
      // ensure we have a run in alternating colours
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.colour==next.colour || card.number!=next.upNumber) return false;
      return true;
    },

    "descending, in suit":
    function(card) {
      if(card.faceDown) return false;
      // ensure we have a running flush from top card on pile to |card|
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.suit!=next.suit || card.number!=next.upNumber) return false;
      return true;
    },

    "descending mod13, in suit, not from foundation":
    function(card) {
      if(card.faceDown || card.parentNode.isFoundation) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.suit!=next.suit || !card.isConsecutiveMod13To(next)) return false;
      return true;
    },

    "descending, in suit, not from foundation":
    function(card) {
      if(card.faceDown || card.parentNode.isFoundation) return false;
      // ensure we have a running flush from top card on pile to |card|
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.suit!=next.suit || card.number!=next.upNumber) return false;
      return true;
    },

    "not from foundation":
    function(card) {
      return (card.faceUp && !card.parentNode.isFoundation);
    },

    "last on pile":
    function(card, target) {
      return (card.faceUp && !card.nextSibling);
    }
  },


  canMoveToPile: {
    "onto up, any in spaces":
    function(card, pile) {
      return !pile.hasChildNodes() || pile.lastChild==card.up;
    },

    "descending":
    function(card, pile) {
      var last = pile.lastChild;
      return !last || (last.faceUp && last.number==card.upNumber);
    },

    "descending mod13":
    function(card, pile) {
      var last = pile.lastChild;
      return (!last || (last.faceUp && last.isConsecutiveMod13To(card)));
    },

    "descending, alt colours, kings in spaces":
    function(card, pile) {
      var last = pile.lastChild;
      return last ? last.faceUp && last.number==card.upNumber && last.colour!=card.colour : card.isKing;
    },

    "descending, in suit, kings in spaces":
    function(card, pile) {
      var last = pile.lastChild;
      return last ? last.faceUp && last.number==card.upNumber && last.suit==card.suit : card.isKing;
    },

    "descending, alt colours":
    function(card, pile) {
      var last = pile.lastChild;
      return !last || (last.faceUp && last.number==card.upNumber && last.colour!=card.colour);
    },

    "descending, same colour":
    function(card, pile) {
      var last = pile.lastChild;
      return !last || (last.faceUp && last.number==card.upNumber && last.colour==card.colour);
    },

    "descending, in suit":
    function(card, pile) {
      var last = pile.lastChild;
      return !last || (last.faceUp && last.number==card.upNumber && last.suit==card.suit);
    },

    "isempty":
    function(card, pile) {
      return !pile.hasChildNodes();
    }
  },


  canMoveToFoundation: {
    "king->ace flush":
    function(card, pile) {
      if(pile && pile.hasChildNodes()) return false; // pile==null for Black Widow
      if(!card.isKing || !card.parentNode.lastChild.isAce) return false;
      var next = card.nextSibling;
      while(next && card.suit==next.suit && card.number==next.upNumber) card = next, next = next.nextSibling;
      return !next; // all cards should be part of the run
    },

    "13 cards":
    function(card, pile) {
      var i = card.parentNode.childNodes.length - 13;
      return (i >= 0 && card.parentNode.childNodes[i]==card);
    },

    "13 cards, if empty":
    function(card, pile) {
      if(pile.hasChildNodes()) return false;
      var i = card.parentNode.childNodes.length - 13;
      return (i >= 0 && card.parentNode.childNodes[i]==card);
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

    "descending mod13, in suit":
    function(pile) {
      if(!pile.hasChildNodes()) return null;
      var card = pile.lastChild, prv = card.previousSibling;
      while(prv && prv.faceUp && prv.isConsecutiveMod13To(card) && prv.suit==card.suit) {
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
      var up = card.up;
      if(up && up.faceUp && up.parentNode.isNormalPile && !up.nextSibling) return up.parentNode;
      return searchPiles(getPilesRound(card.parentNode), testPileIsEmpty);
    }
  },


  autoplayMove: {
    // To use this games must have 4 foundations, built one card at a time, starting with those cards
    // in foundationBases[], and continuing with the unique |up| member of each card.
    // Cards' mayAutoplay field can be overridden with a getter function if needed.
    // xxx the .faceUp checks are redundant with the !.nextSibling ones at present
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
    }
  }
}
