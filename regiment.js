Games.regiment = true;

AllGames.regiment = {
  __proto__: BaseCardGame,

  id: "regiment",
  cards: 2,
  canMoveCard: "last on pile",

  init: function() {
    var cs = this.cards = makeDecks(2);
    const fs = this.foundations, ps = this.piles, rs = this.reserves;

    for(var i = 0; i != 8; i++) {
      fs[i].isAceFoundation = (i < 4);
      rs[i].up = ps[i]; rs[i].down = ps[i+8]; rs[i].col = i;
    }
    for(i = 0; i != 16; i++) {
      ps[i].col = i % 8;
      ps[i].following = ps.slice(i+1).concat(ps.slice(0, i));
    }
    this.aceFoundations = fs.slice(0,4);
    this.kingFoundations = fs.slice(4,8);

    const acepos = [0, 13, 26, 39, 52, 65, 78, 91];
    var as = this.aces = new Array(8);
    var ks = this.kings = new Array(8);
    for(i = 0; i != 8; i++) as[i] = cs[acepos[i]], ks[i] = cs[acepos[i]+12];
  },

  deal: function(cards) {
    for(var i = 0; i != 16; i++) dealToPile(cards,this.piles[i],0,1);
    for(i = 0; i != 8; i++) dealToPile(cards,this.reserves[i],10,1);
  },

  canMoveToFoundation: function(card, pile) {
    var last = pile.lastChild, twinp = card.twin.parentNode;
    if(pile.isAceFoundation) {
      // can't start a second ace foundation for a suit
      if(card.isAce) return !last && !(twinp.isFoundation && twinp.isAceFoundation);
      return last && card.number==last.upNumber && card.suit==last.suit;
    }

    if(card.isKing) return !last && !(twinp.isFoundation && !twinp.isAceFoundation);
    return last && last.number==card.upNumber && card.suit==last.suit;
  },

  canMoveToPile: function(card, target) {
    // piles are built up or down (or both) within suit
    var last = target.lastChild;
    if(last) return card.suit==last.suit && card.differsByOneFrom(last);

    // empty piles must be filled from the closest reserve pile
    var source = card.parentNode.source;
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
    const parent = card.parentNode;
    const ps = parent.isNormalPile ? parent.following : this.piles, num = ps.length;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      if(p.hasChildNodes() && this.canMoveToPile(card, p)) return p;
    }
    // xxx
    if(parent.isReserve) return searchPiles(this.piles, testCanMoveToEmptyPile(card));
    return null;
  },

  autoplayMove: function(pileWhichHasHadCardsRemoved) {
    var i, pile, last, card;
    if(pileWhichHasHadCardsRemoved) {
      pile = pileWhichHasHadCardsRemoved;
      if(pile.isNormalPile && !pile.hasChildNodes() && this.reserves[pile.col].hasChildNodes())
        return this.moveTo(this.reserves[pile.col].lastChild, pile);
    }

    for(i = 0; i != 4; i++) {
      pile = this.foundations[i], last = pile.lastChild;
      if(last && last.up && last.twin.parentNode.isFoundation) {
        card = last.up.parentNode.isFoundation ? last.twin.up : last.up;
        if(!card.nextSibling) return this.moveTo(card, pile);
      }
    }
    for(i = 4; i != 8; i++) {
      pile = this.foundations[i], last = pile.lastChild;
      if(last && last.down && last.twin.parentNode.isFoundation) {
        card = last.down.parentNode.isFoundation ? last.twin.down : last.down;
        if(!card.nextSibling) return this.moveTo(card, pile);
      }
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
