Games.regiment = true;

AllGames.regiment = {
  __proto__: BaseCardGame,

  id: "regiment",
  cards: 2,
  canMoveCard: "last on pile",

  init: function() {
    for(var i = 0; i != 8; i++) {
      this.foundations[i].isAceFoundation = (i < 4);
      this.reserves[i].col = i;
      this.piles[i].col = i;
      this.piles[i+8].col = i;
    }
    this.autoplayFrom = this.piles.concat(this.reserves);
    this.aceFoundations = this.foundations.slice(0,4);
    this.kingFoundations = this.foundations.slice(4,8);
  },

  deal: function(cards) {
    for(var i = 0; i != 16; i++) dealToPile(cards,this.piles[i],0,1);
    for(i = 0; i != 8; i++) dealToPile(cards,this.reserves[i],10,1);
  },

  // this is likely to be the standard format for games with a set of both Ace and King foundations
  canMoveToFoundation: function(card, target) {
    var last = target.lastChild;
    if(target.isAceFoundation) {
      // can move an ace provided we haven't already got an Ace foundation for this suit,
      // or can build the foundation up in suit
      return (last ? (card.isConsecutiveTo(last) && card.isSameSuit(last))
                   : (card.isAce && this.canMakeFoundation(true,card.suit)) );
    } else {
      // can start a king foundation for the suit if we don't have one already,
      // or can build the foundation down in suit
      return (last ? (last.isConsecutiveTo(card) && card.isSameSuit(last))
                   : (card.isKing && this.canMakeFoundation(false,card.suit)) );
    }
  },
  canMakeFoundation: function(isAceFoundation, suit) {
    var fs = isAceFoundation ? this.aceFoundations : this.kingFoundations;
    for(var i = 0; i != 4; i++) {
      var last = fs[i].lastChild;
      if(last && last.suit==suit) return false;
    }
    return true;
  },

  canMoveToPile: function(card, target) {
    var source = card.parentNode.source;
    var last = target.lastChild;

    // piles are built up or down (or both) within suit
    if(last) return (card.isSameSuit(last) && card.differsByOneFrom(last));

    // can only move to an empty pile from the closest reserve pile(s)
    if(!source.isReserve) return false;

    var tcol = target.col, scol = source.col;
    if(tcol==scol) return true;
    if(this.reserves[tcol].hasChildNodes()) return false;

    var coldiff = Math.abs(tcol-scol);
    var piles = getPilesRound(this.reserves[tcol]);
    for(var i = 0; i!=piles.length && Math.abs(piles[i].col-tcol)!=coldiff; i++)
      if(piles[i].hasChildNodes()) return false;
    return true;
  },

  getHints: function() {
    for(var i = 0; i != 8; i++) this.addHintsFor(this.reserves[i].lastChild);
    for(i = 0; i != 16; i++) this.addHintsFor(this.piles[i].lastChild);
  },

  getBestMoveForCard: function(card) {
    return searchPiles(this.piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(this.piles, testCanMoveToEmptyPile(card));
  },

  autoplayMove: function() {
    // move stuff to foundations
    for(var i = 0; i != this.autoplayFrom.length; i++) {
      var source = this.autoplayFrom[i].lastChild;
      if(source && this.autoplayToFoundations(source)) return true;
    }
    // fill empty spaces, but only from reserves in same column
    for(i = 0; i != 8; i++) {
      var last = this.reserves[i].lastChild;
      if(!last) continue;
      if(!this.piles[i].hasChildNodes())
        return this.moveTo(last, this.piles[i]);
      if(!this.piles[i+8].hasChildNodes())
        return this.moveTo(last, this.piles[i+8]);
    }
    return false;
  },
  autoplayToFoundations: function(card) {
    var test = testLastIsSuit(card.suit);
    var af = searchPiles(this.aceFoundations, test);
    if(!af) return false;
    var kf = searchPiles(this.kingFoundations, test);
    if(!kf) return false;

    var ac = af.lastChild, kc = kf.lastChild;
    if(card.isConsecutiveTo(ac) && card.number > kc.number) {
      this.moveTo(card, af);
      return true;
    }
    if(kc.isConsecutiveTo(card) && card.number < ac.number) {
      this.moveTo(card, kf);
      return true;
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :  10,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
};
