/*
Standard forms for the various functions that games need to provide.
To use a standard form for canMoveCard set the game's rule_canMoveCard var, and similar
for other functions.

Current choices:

rule_canMoveCard:
  "descending"
  "descending,alt-colours"
  "descending,in-suit"
  "descending,in-suit,not-from-foundation"
  "last-on-pile"

rule_canMoveToPile:
  "descending"
  "descending,alt-colours,kings-in-spaces"
  "descending,in-suit,kings-in-spaces"
  "descending,alt-colours"
  "descending,in-suit"
  "isempty"

rule_dealFromStock:
  "to-waste"
  "to-waste,can-turn-stock-over"
  "to-foundation"
  "to-stacks"
  "to-stacks,if-none-empty"

*/

var Rules = {
  canMoveCard: {
    "descending":
    function(card) {
      if(card.faceDown()) return false;
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling) {
        if(card.notConsecutiveTo(next)) return false;
      }
      return true;
    },

    "descending,alt-colours":
    function(card) {
      if(card.faceDown()) return false;
      // ensure we have a run in alternating colours
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling) {
        if(card.isSameColour(next) || card.notConsecutiveTo(next)) return false;
      }
      return true;
    },

    "descending,in-suit":
    function(card) {
      if(card.faceDown()) return false;
      // ensure we have a running flush from top card on stack to |card|
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling) {
        if(card.notSameSuit(next) || card.notConsecutiveTo(next)) return false;
      }
      return true;
    },

    "descending,in-suit,not-from-foundation":
    function(card) {
      if(card.faceDown()) return false;
      if(card.parentNode.isFoundation) return false;
      // ensure we have a running flush from top card on stack to |card|
      for(var next = card.nextSibling; next; card = next, next = next.nextSibling) {
        if(card.notSameSuit(next) || card.notConsecutiveTo(next)) return false;
      }
      return true;
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
      return (!last || last.isConsecutiveTo(card));
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

    "descending,in-suit":
    function(card, pile) {
      var last = pile.lastChild;
      return (!last || (last.faceUp() && last.isConsecutiveTo(card) && last.isSameSuit(card)));
    },

    "isempty":
    function(card, pile) {
      return !pile.hasChildNodes();
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

    "to-stacks": function() {
      if(!this.stock.hasChildNodes()) return;
      this.doAction(new DealFromStockToStacksAction(this.stacks));
    },

    "to-stacks,if-none-empty": function() {
      if(!this.stock.hasChildNodes()) return;
      for(var i = 0; i < Game.stacks.length; i++) if(!Game.stacks[i].hasChildNodes()) return;
      this.doAction(new DealFromStockToStacksAction(this.stacks));
    }
  }
}

