Games["tripeaks"] = {
  __proto__: BaseCardGame,

  id: "tripeaks",
  mouseHandling: "pyramid",
  dealFromStock: "to waste",

  init: function() {
    // The numbers of the piles that should be the leftChild of piles 0 to 17.
    // (The rightChild's are all 1 greater than the leftChild's.)
    // Piles 18-27 have no children.
    const lefts = [3,5,7,9,10,12,13,15,16,18,19,20,21,22,23,24,25,26];

    var ps = this.piles;

    for(var i = 0; i != 18; i++) {
      var p = ps[i];
      var l = ps[lefts[i]];
      var r = ps[lefts[i]+1];
      p.leftChild = l;
      l.rightParent = p;
      p.rightChild = r;
      r.leftParent = p;
    }

    // these are the piles which have no left/right parent
    const nolp = [0,1,2,3,5,7,9,12,15,18];
    const norp = [0,1,2,4,6,8,11,14,17,27];
    for(i = 0; i != nolp.length; i++) ps[nolp[i]].leftParent = null;
    for(i = 0; i != norp.length; i++) ps[norp[i]].rightParent = null;

    // handler, and we need them to have .leftChild and .rightChild
    for(i = 0; i != ps.length; i++) {
      var s = ps[i];
      s.isPeak = false;
      s.leftFree = function() { return !(this.leftChild && this.leftChild.hasChildNodes()); };
      s.rightFree = function() { return !(this.rightChild && this.rightChild.hasChildNodes()); };
      s.free = function() { return !(this.leftChild && (this.leftChild.hasChildNodes() || this.rightChild.hasChildNodes())); };
    }
    ps[0].isPeak = ps[1].isPeak = ps[2].isPeak = true;

    // convenience
    this.waste.free = function() { return true; };
  },

  deal: function(cards) {
    for(var i = 0; i != 18; i++) dealToPile(cards, this.piles[i], 1, 0);
    for(i = 18; i != 28; i++) dealToPile(cards, this.piles[i], 0, 1);
    dealToPile(cards, this.waste, 0, 1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  canRemoveCard: function(card) {
    // can be called with waste.lastChild, but that won't matter
    return card.differsByOneMod13From(this.waste.lastChild) && card.parentNode.free();
  },

  removeCard: function(card) {
    this.doAction(new MoveAction(card, card.parentNode, this.waste));
  },

  canSelectCard: function(card) {
    return false;
  },

  // since we never allow a card to be selected canRemovePair and removePair don't actually matter
  canRemovePair: function(a, b) {
    return false;
  },

  removePair: function(a, b) {
  },

  getHints: function() {
    // xxx write me!
  },

  // This game has no autoplay, but does need special auto-revealing:
  autoReveal: function() {
    for(var i = 27; i >= 0; i--) {
      var p = this.piles[i];
      if(!p.hasChildNodes() || p.lastChild.faceUp || !p.free()) continue;
      this.doAction(new RevealCardAction(p.lastChild));
      return true;
    }
    return false;
  },

  hasBeenWon: function() {
    // won when the the peaks are empty
    for(var i = 0; i != 3; i++) if(this.piles[i].hasChildNodes()) return false;
    return true;
  },

  getScoreFor: function(action) {
    if(action instanceof DealFromStockToPileAction) {
      action.streakLength = 0;
      return -5;
    }

    var done = this.actionsDone;
    var prev = done.length>1 ? done[done.length-2] : null;

    if(action instanceof RevealCardAction) {
      action.streakLength = prev ? prev.streakLength : 0;
      return 0;
    }

    // it's a MoveAction
    var score = action.streakLength = prev ? prev.streakLength + 1 : 1;

    // bonuses for removing a peak card
    var pile = action.source, ps = this.piles;
    if(pile.isPeak)
      score += (ps[0].hasChildNodes() + ps[1].hasChildNodes() + ps[2].hasChildNodes() == 1) ? 30 : 15;

    return score;
  }
}
