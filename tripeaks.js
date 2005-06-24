Games.tripeaks = {
  __proto__: BaseCardGame,

  id: "tripeaks",
  mouseHandling: "pyramid",
  dealFromStock: "to waste",

  init: function() {
    this.cards = makeDecksMod13(1);

    // The numbers of the piles that should be the leftChild of piles 0-17, rightChilds are all 1 greater.
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
      s.__defineGetter__("leftFree", function() { return !this.leftChild || !this.leftChild.hasChildNodes(); });
      s.__defineGetter__("rightFree", function() { return !this.rightChild || !this.rightChild.hasChildNodes(); });
      s.__defineGetter__("free", function() { return !(this.leftChild && (this.leftChild.hasChildNodes() || this.rightChild.hasChildNodes())); });
    }
    ps[0].isPeak = ps[1].isPeak = ps[2].isPeak = true;

    this.waste.free = true;
  },

  deal: function(cards) {
    for(var i = 0; i != 18; i++) this.piles[i].dealTo(cards, 1, 0);
    for(i = 18; i != 28; i++) this.piles[i].dealTo(cards, 0, 1);
    this.waste.dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  canRemoveCard: function(card) {
    // can be called with waste.lastChild, but that won't matter
    return card.differsByOneFrom(this.waste.lastChild) && card.parentNode.free;
  },

  removeCard: function(card) {
    doo(new Move(card, this.waste));
    //doo(new Move(card, this.waste, card.parentNode));
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

  // xxx write getHints()

  cardWaitingToBeRevealed: null,

  // This game has no autoplay, but does need special auto-revealing:
  autoplay: function(pileWhichHasHadCardsRemoved) {
    var card = this.cardWaitingToBeRevealed;
    if(card) {
      this.cardWaitingToBeRevealed = null;
      return new Reveal(card);
    }

    if(!pileWhichHasHadCardsRemoved) return null;

    const pile = pileWhichHasHadCardsRemoved;
    const left = pile.leftParent, right = pile.rightParent;
    if(left && left.leftFree) {
      if(right && right.rightFree) this.cardWaitingToBeRevealed = right.lastChild;
      return new Reveal(left.lastChild);
    }
    if(right && right.rightFree) return new Reveal(right.lastChild);

    return null;
  },

  getCardsToBeRevealed: function(pileWhichHasHadCardsRemoved) {
    if(!pileWhichHasHadCardsRemoved) return [];
    const lp = pileWhichHasHadCardsRemoved.leftParent, rp = pileWhichHasHadCardsRemoved.rightParent;
    if(lp && rp) return [lp.firstChild, rp.firstChild];
    if(lp) return [lp.firstChild];
    if(rp) return [rp.firstChild];
    return [];
  },

  isWon: function() {
    // won when the the peaks are empty
    for(var i = 0; i != 3; i++) if(this.piles[i].hasChildNodes()) return false;
    return true;
  },

  getScoreFor: function(action) {
    if(action instanceof DealToPile) {
      action.streakLength = 0;
      return -5;
    }

    var done = this.actionsDone;
    var prev = done.length>1 ? done[done.length-2] : null;

    if(action instanceof Reveal) {
      action.streakLength = prev ? prev.streakLength : 0;
      return 0;
    }

    // it's a Move
    var score = action.streakLength = prev ? prev.streakLength + 1 : 1;

    // bonuses for removing a peak card
    var pile = action.source, ps = this.piles;
    if(pile.isPeak)
      score += (ps[0].hasChildNodes() + ps[1].hasChildNodes() + ps[2].hasChildNodes() == 1) ? 30 : 15;

    return score;
  }
}
