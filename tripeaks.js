Games["tripeaks"] = {
  __proto__: BaseCardGame,

  id: "tripeaks",
  mouseHandling: "pyramid",
  rule_dealFromStock: "to-waste",

  init: function() {
    // The numbers of the piles that should be the leftChild of piles 0 to 17.
    // (The rightChild's are all 1 greater than the leftChild's.)
    // Piles 18-27 have no children.
    const lefts = [3,5,7,9,10,12,13,15,16,18,19,20,21,22,23,24,25,26];
    
    for(var i = 0; i != 18; i++) {
      var p = this.stacks[i];
      var l = this.stacks[lefts[i]];
      var r = this.stacks[lefts[i]+1];
      p.leftChild = l;
      l.rightParent = p;
      p.rightChild = r;
      r.leftParent = p;
    }
    
    // these are the piles which have no left/right parent
    const nolp = [0,1,2,3,5,7,9,12,15,18];
    const norp = [0,1,2,4,6,8,11,14,17,27];
    for(i = 0; i != nolp.length; i++) this.stacks[nolp[i]].leftParent = null;
    for(i = 0; i != norp.length; i++) this.stacks[norp[i]].rightParent = null;

    // handler, and we need them to have .leftChild and .rightChild
    for(i = 0; i < this.stacks.length; i++) {
      var s = this.stacks[i];
      s.leftFree = function() { return !(this.leftChild && this.leftChild.hasChildNodes()); };
      s.rightFree = function() { return !(this.rightChild && this.rightChild.hasChildNodes()); };
      s.free = function() { return !(this.leftChild && (this.leftChild.hasChildNodes() || this.rightChild.hasChildNodes())); };
    }
    // convenience
    this.waste.free = function() { return true; };
  },

  deal: function() {
    var cards = this.shuffleDecks(1);
    for(var i = 0; i != 18; i++) this.dealToStack(cards, this.stacks[i], 1, 0);
    for(i = 18; i != 28; i++) this.dealToStack(cards, this.stacks[i], 0, 1);
    this.dealToStack(cards, this.waste, 0, 1);
    this.dealToStack(cards, this.stock, cards.length, 0);
  },
  
  canRemoveCard: function(card) {
    // can be called with waste.lastChild, but that won't matter
    return card.differsByOneMod13To(this.waste.lastChild) && card.parentNode.free();
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
      var p = this.stacks[i];
      if(!p.hasChildNodes() || p.lastChild.faceUp() || !p.free()) continue;
      p.lastChild.turnFaceUp();
      return true;
    }
    return false;
  },

  hasBeenWon: function() {
    // won when the the peaks are empty
    for(var i = 0; i != 3; i++) if(this.stacks[i].hasChildNodes()) return false;
    return true;
  }
}
