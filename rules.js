/*
Standard forms for the various functions that games need to provide.
To use a standard form for canMoveCard set the game's rule_canMoveCard var, and similar
for other functions.

Current choices:

rule_canMoveCard:
  "descending"
  "descending, not from foundation"
  "descending,alt-colours"
  "descending, in suit"
  "descending mod13, in suit, not from foundation":
  "descending, in suit, not from foundation"
  "not from foundation"
  "last-on-pile"

rule_canMoveToPile:
  "descending"
  "descending mod13"
  "descending,alt-colours,kings-in-spaces"
  "descending,in-suit,kings-in-spaces"
  "descending,alt-colours"
  "descending, in suit"
  "isempty"

rule_canMoveToFoundation:
  "king->ace flush"
  "13 cards"  (any set of 13 card. canMoveCard will ensure they're a running flush, or whatever)

rule_dealFromStock:
  "to-waste"
  "to-waste,can-turn-stock-over"
  "to-foundation"
  "to-piles"
  "to-piles,if-none-empty"
  "to-nonempty-piles"

xxx these (c|sh)ould just use the rule_canMoveCard value
rule_getLowestMovableCard:
  "descending, in suit"
  "descending mod13, in suit"
  "descending, alt colours"
  "face up":

*/

var Rules = {
  canMoveCard: {
    "descending":
    function(card) {
      if(card.faceDown()) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.notConsecutiveTo(next)) return false;
      return true;
    },

    "descending, not from foundation":
    function(card) {
      if(card.faceDown() || card.parentNode.isFoundation) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.notConsecutiveTo(next)) return false;
      return true;
    },

    "descending,alt-colours":
    function(card) {
      if(card.faceDown()) return false;
      // ensure we have a run in alternating colours
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.isSameColour(next) || card.notConsecutiveTo(next)) return false;
      return true;
    },

    "descending, in suit":
    function(card) {
      if(card.faceDown()) return false;
      // ensure we have a running flush from top card on stack to |card|
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.notSameSuit(next) || card.notConsecutiveTo(next)) return false;
      return true;
    },

    "descending mod13, in suit, not from foundation":
    function(card) {
      if(card.faceDown() || card.parentNode.isFoundation) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.notSameSuit(next) || !card.isConsecutiveMod13To(next)) return false;
      return true;
    },

    "descending, in suit, not from foundation":
    function(card) {
      if(card.faceDown() || card.parentNode.isFoundation) return false;
      // ensure we have a running flush from top card on stack to |card|
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
        if(card.notSameSuit(next) || card.notConsecutiveTo(next)) return false;
      return true;
    },

    "not from foundation":
    function(card) {
      return (card.faceUp() && !card.parentNode.isFoundation);
    },

    "last-on-pile":
    function(card, target) {
      return (card.faceUp() && !card.nextSibling);
    }
  },


  canMoveToPile: {
    "descending":
    function(card, pile) {
      var last = pile.lastChild;
      return (!last || (last.faceUp() && last.isConsecutiveTo(card)));
    },

    "descending mod13":
    function(card, pile) {
      var last = pile.lastChild;
      return (!last || (last.faceUp() && last.isConsecutiveMod13To(card)));
    },

    "descending,alt-colours,kings-in-spaces":
    function(card, pile) {
      var last = pile.lastChild;
      return (last ? last.faceUp() && last.isConsecutiveTo(card) && last.notSameColour(card) : card.isKing());
    },

    "descending,in-suit,kings-in-spaces":
    function(card, pile) {
      var last = pile.lastChild;
      return (last ? last.faceUp() && last.isConsecutiveTo(card) && last.isSameSuit(card) : card.isKing());
    },

    "descending,alt-colours":
    function(card, pile) {
      var last = pile.lastChild;
      return (!last || (last.faceUp() && last.isConsecutiveTo(card) && last.notSameColour(card)));
    },

    "descending, in suit":
    function(card, pile) {
      var last = pile.lastChild;
      return (!last || (last.faceUp() && last.isConsecutiveTo(card) && last.isSameSuit(card)));
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
      if(!card.isKing() || !card.parentNode.lastChild.isAce()) return false;
      var next = card.nextSibling;
      while(next && card.isSameSuit(next) && card.isConsecutiveTo(next)) card = next, next = next.nextSibling;
      return !next; // all cards should be part of the run
    },

    "13 cards":
    function(card, pile) {
      var i = card.parentNode.childNodes.length - 13;
      return (i >= 0 && card.parentNode.childNodes[i]==card);
    }
  },


  dealFromStock: {
    "to-waste": function() {
      if(this.stock.hasChildNodes()) this.doAction(new DealFromStockToPileAction(this.waste));
    },

    "to-waste,can-turn-stock-over": function() {
      if(this.stock.hasChildNodes()) this.doAction(new DealFromStockToPileAction(this.waste));
      else this.doAction(new TurnStockOverAction());
    },

    "to-foundation": function() {
      if(this.stock.hasChildNodes()) this.doAction(new DealFromStockToPileAction(this.foundation));
    },

    "to-piles": function() {
      if(!this.stock.hasChildNodes()) return;
      this.doAction(new DealToPilesAction(this.stacks));
    },

    "to-piles,if-none-empty": function() {
      if(!this.stock.hasChildNodes()) return;
      for(var i = 0; i < Game.stacks.length; i++) if(!Game.stacks[i].hasChildNodes()) return;
      this.doAction(new DealToPilesAction(this.stacks));
    },

    "to-nonempty-piles": function() {
      this.doAction(new DealToNonEmptyPilesAction());
    }
  },


  getLowestMovableCard: {
    "descending, in suit":
    function(pile) {
      if(!pile.hasChildNodes()) return null;
      var card = pile.lastChild, prv = card.previousSibling;
      while(prv && prv.faceUp() && prv.isConsecutiveTo(card) && prv.isSameSuit(card)) {
        card = prv; prv = card.previousSibling;
      }
      return card;
    },

    "descending mod13, in suit":
    function(pile) {
      if(!pile.hasChildNodes()) return null;
      var card = pile.lastChild, prv = card.previousSibling;
      while(prv && prv.faceUp() && prv.isConsecutiveMod13To(card) && prv.isSameSuit(card)) {
        card = prv; prv = card.previousSibling;
      }
      return card;
    },

    "descending, alt colours":
    function(pile) {
      if(!pile.hasChildNodes()) return null;
      var card = pile.lastChild, prv = card.previousSibling;
      while(prv && prv.faceUp() && prv.isConsecutiveTo(card) && prv.colour()!=card.colour()) {
        card = prv; prv = card.previousSibling;
      }
      return card;
    },

    "face up":
    function(pile) {
      if(!pile.hasChildNodes()) return null;
      var card = pile.lastChild, prv = card.previousSibling;
      while(prv && prv.faceUp()) card = prv, prv = card.previousSibling;
      return card;
    }
  }
}
