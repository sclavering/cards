Games.pyramid = true;

AllGames.pyramid = {
  __proto__: BaseCardGame,

  id: "pyramid",
  mouseHandling: "pyramid",
  dealFromStock: "to waste, can turn stock over",

  init: function() {
    var i, row, col;
    // All piles must have .leftParent and .rightParent fields for the mouse
    // handler, and we need them to have .leftChild and .rightChild
    for(i = 0; i != this.piles.length; i++) {
      var s = this.piles[i];
      s.leftParent = null; s.rightParent = null;
      s.leftChild = null; s.rightChild = null;
      s.leftFree = function() { return !(this.leftChild && this.leftChild.hasChildNodes()); };
      s.rightFree = function() { return !(this.rightChild && this.rightChild.hasChildNodes()); };
      s.free = function() { return !(this.leftChild && (this.leftChild.hasChildNodes() || this.rightChild.hasChildNodes())); };
    }
    // now set the non-null values where applicable
    for(i = 0, row = 1, col = 1; i <= 20; i++) {
      this.piles[i].leftChild = this.piles[i+row];
      this.piles[i+row].rightParent = this.piles[i];
      this.piles[i].rightChild = this.piles[i+row+1];
      this.piles[i+row+1].leftParent = this.piles[i];
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

  deal: function(cards) {
    for(var i = 0; i != 28; i++) dealToPile(cards, this.piles[i], 0, 1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  canRemoveCard: function(card) {
    return card.isKing && card.parentNode.free();
  },

  removeCard: function(card) {
    // we don't use MoveAction because we don't want animation (for consistency with removing pairs)
    this.doAction(new PyramidMoveAction(card,null));
  },

  canSelectCard: function(card) {
    return card.parentNode.free();
  },

  canRemovePair: function(a, b) {
    if(a.number+b.number!=13) return false;
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

  // this game has no autoplay

  hasBeenWon: function() {
    // won when the tip of the pyramid has been removed
    return !this.piles[0].hasChildNodes();
  }
}


function PyramidMoveAction(card1, card2) {
  this.c1 = card1; this.p1 = card1.parentNode;
  this.c2 = card2; this.p2 = card2 ? card2.parentNode : null;
}
PyramidMoveAction.prototype = {
  action: "pyramid-move",
  synchronous: true,

  perform: function() {
    Game.foundation.addCards(this.c1);
    if(this.c2) Game.foundation.addCards(this.c2);
  },
  undo: function(undo) {
    if(this.c2) this.p2.addCards(this.c2);
    this.p1.addCards(this.c1);
  }
}
