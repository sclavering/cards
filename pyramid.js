Games["pyramid"] = {
  __proto__: BaseCardGame,

  id: "pyramid",
  mouseHandling: "pyramid",
  rule_dealFromStock: "to-waste,can-turn-stock-over",

  init: function() {
    var i, row, col;
    // All piles must have .leftParent and .rightParent fields for the mouse
    // handler, and we need them to have .leftChild and .rightChild
    for(i = 0; i < this.stacks.length; i++) {
      var s = this.stacks[i];
      s.leftParent = null; s.rightParent = null;
      s.leftChild = null; s.rightChild = null;
      s.leftFree = function() { return !(this.leftChild && this.leftChild.hasChildNodes()); };
      s.rightFree = function() { return !(this.rightChild && this.rightChild.hasChildNodes()); };
      s.free = function() { return !(this.leftChild && (this.leftChild.hasChildNodes() || this.rightChild.hasChildNodes())); };
    }
    // now set the non-null values where applicable
    for(i = 0, row = 1, col = 1; i <= 20; i++) {
      this.stacks[i].leftChild = this.stacks[i+row];
      this.stacks[i+row].rightParent = this.stacks[i];
      this.stacks[i].rightChild = this.stacks[i+row+1];
      this.stacks[i+row+1].leftParent = this.stacks[i];
      if(col==row) {
        col = 1;
        row++;
      } else {
        col++;
      }
    }
    // convenience
    this.foundation.free = function() { return false; };
    this.waste.free = function() { return true; };
  },

  deal: function() {
    var cards = this.shuffleDecks(1);
//    for(var i = 0; i < 15; i++) this.dealToStack(cards, this.stacks[i], 0, 1);
    for(var i = 0; i < 28; i++) this.dealToStack(cards, this.stacks[i], 0, 1);
    this.dealToStack(cards, this.stock, cards.length, 0);
  },

  canRemoveCard: function(card) {
    return card.isKing() && card.parentNode.free();
  },
  
  removeCard: function(card) {
    // we don't use MoveAction because we don't want animation (for consistency with removing pairs)
    this.doAction(new PyramidMoveAction(card,null));
  },
  
  canSelectCard: function(card) {
//    return true;
    return card.parentNode.free();
  },
  
  canRemovePair: function(a, b) {
    if(a.number()+b.number()!=13) return false;
    var ap = a.parentNode, bp = b.parentNode;
    if(ap.free()) {
      if(bp.free()) return true;
      // ap could be a branch from bp
      return (bp.leftChild==ap && bp.rightFree())
          || (bp.rightChild==ap && bp.leftFree());
    }
    if(bp.free()) {
      return (ap.leftChild==bp && ap.rightFree())
          || (ap.rightChild==bp && ap.leftFree());
    }
    return false;
  },
  
  removePair: function(a, b) {
    this.doAction(new PyramidMoveAction(a,b));
  },

  getHints: function() {
    // xxx write me!
  },

  // this game has no smartMove
  
  // this game has no autoplay

  hasBeenWon: function() {
    // won when the tip of the pyramid has been removed
    return !this.stacks[0].hasChildNodes();
  }
}


function PyramidMoveAction(card1, card2) {
  this.c1 = card1; this.p1 = card1.parentNode;
  this.c2 = card2; this.p2 = card2 ? card2.parentNode : null;
}
PyramidMoveAction.prototype = {
  action: "pyramid-move",
  
  perform: function() {
    this.c1.transferTo(Game.foundation);
    if(this.c2) this.c2.transferTo(Game.foundation);
    Game.autoplay();
  },
  undo: function(undo) {
    if(this.c2) this.c2.transferTo(this.p2);
    this.c1.transferTo(this.p1);
  }
}
