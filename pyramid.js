Games["pyramid"] = {
  __proto__: BaseCardGame,

  id: "pyramid",
  mouseHandling: "click-to-select",
  rule_dealFromStock: "to-waste,can-turn-stock-over",

  init: function() {
    // set up a children array on each pile, which consists of the piles immediately covering it
    for(var i = 0, row = 1, col = 1; i <= 20; i++) {
      this.stacks[i].children = [this.stacks[i+row], this.stacks[i+row+1]];
      if(col==row) {
        col = 1;
        row++;
      } else {
        col++;
      }
    }
    // piles on bottom row have no children
    for(i = 21; i < 28; i++) this.stacks[i].children = [];
  },

  deal: function() {
    var cards = this.getCardDecks(1);
    //xxx Remove the kings, because making them be moved to the foundation when clicked
    // on would require some serious redesigning-of/hacks-in MouseHandler2.
    cards.splice(51,1); cards.splice(38,1); cards.splice(25,1); cards.splice(12,1);
    cards = this.shuffle(cards);

    for(var i = 0; i < 28; i++) this.dealToStack(cards, this.stacks[i], 0, 1);
    this.dealToStack(cards, this.stock, cards.length, 0);
  },

  canMoveCard: function(card) {
    if(card.parentNode.isFoundation || !card.isLastOnPile()) return false;
    if(card.parentNode.isWaste) return true;
    var kids = card.parentNode.children;
    for(var i = 0; i < kids.length; i++) if(kids[i].hasChildNodes()) return false;
    return true;
  },

  canMoveTo: function(card, pile) {
    if(pile.isStock || pile.isFoundation) return false;
    var last = pile.lastChild;
    if(!last) return false;

    if(!pile.isWaste) {
      // the destination pile must either have both children empty, or one child
      // empty and the other containing |card|
      var kids = pile.children;
      for(var i = 0; i < kids.length; i++)
        if(kids[i]!=card.parentNode && kids[i].hasChildNodes()) return false;
    }

    return (card.number() + last.number() == 13);
  },

  // "target" is the second card of the pair to be removed (to the foundation).
  moveTo: function(card, target) {
    this.doAction(new PyramidMoveAction(card.parentNode, target));
    return true;
  },

  getHints: function() {
    // xxx write me!
  },

  // this game has no smartMove
  
  // this game has no autoplay

  hasBeenWon: function() {
    for(var i = 0; i < this.stacks.length; i++)
      if(this.stacks[i].hasChildNodes())
        return false;
    return true;
  }
}


function PyramidMoveAction(pile1, pile2) {
  this.pile1 = pile1;
  this.pile2 = pile2;
}
PyramidMoveAction.prototype = {
  action: "pyramid-move",
  
  perform: function() {
    this.pile1.lastChild.transferTo(Game.foundation);
    this.pile2.lastChild.transferTo(Game.foundation);
    Game.autoplay();
  },
  undo: function(undo) {
    Game.foundation.lastChild.transferTo(this.pile2);
    Game.foundation.lastChild.transferTo(this.pile1);
  }
}
