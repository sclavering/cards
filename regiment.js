Games.regiment = true;

AllGames.regiment = {
  __proto__: BaseCardGame,

  id: "regiment",
  cards: 2,

  init: function() {
    var cs = this.cards = makeDecks(2);
    const fs = this.foundations, ps = this.piles, rs = this.reserves;

    for(var i = 0; i != 8; i++) {
      fs[i].isAceFoundation = (i < 4);
      rs[i].up = ps[i]; rs[i].down = ps[i+8]; rs[i].col = i;
    }
    for(i = 0; i != 16; i++) {
      var col = ps[i].col = i % 8;
      ps[i].reserve = rs[col];
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
    for(var i = 0; i != 16; i++) this.piles[i].dealTo(cards, 0, 1);
    for(i = 0; i != 8; i++) this.reserves[i].dealTo(cards, 10, 1);
  },

  mayTakeCardFromPile: "single card",

  mayAddCardToFoundation: function(card) {
    var last = this.lastChild, twinp = card.twin.parentNode;
    if(this.isAceFoundation) {
      // can't start a second ace foundation for a suit
      if(card.isAce) return !last && !(twinp.isFoundation && twinp.isAceFoundation);
      return last && card.number==last.upNumber && card.suit==last.suit;
    }

    if(card.isKing) return !last && !(twinp.isFoundation && !twinp.isAceFoundation);
    return last && last.number==card.upNumber && card.suit==last.suit;
  },

  mayAddCardToPile: function(card) {
    // piles are built up or down (or both) within suit
    var last = this.lastChild;
    if(last) return card.suit==last.suit && card.differsByOneFrom(last);

    // empty piles must be filled from the closest reserve pile
    var source = card.parentNode.source;
    if(!source.isReserve) return false;

    var reserve = this.reserve;
    if(reserve==source) return true;

    if(reserve.hasChildNodes()) return false;

    var prev = reserve.prev, prevDist = 1;
    while(prev && !prev.hasChildNodes() && prev!=source) prev = prev.prev, prevDist++;
    var next = reserve.next, nextDist = 1;
    while(next && !next.hasChildNodes() && next!=source) next = next.next, nextDist++;

    // if trying to move from a reserve to the right
    if(source.col > this.col) return next==source && (!prev || prevDist>=nextDist);
    return prev==source && (!next || nextDist>=prevDist);
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
      if(p.hasChildNodes() && p.mayAddCard(card)) return p;
    }
    // look for an empty pile to move the card to
    if(!parent.isReserve) return null;
    var prev = parent.prev, next = parent.next;

    while(prev || next) {
      if(next) {
        if(next.hasChildNodes()) next = null;
        else {
          p = !next.up.hasChildNodes() ? next.up : (!next.down.hasChildNodes() ? next.down : null);
          if(p) {
            if(p.mayAddCard(card)) return p;
            else next = null; // another reserve is closer to p; it will be closer to any pile right of p too
          } else next = next.next;
        }
      }
      if(prev) {
        if(prev.hasChildNodes()) prev = null;
        else {
          p = !prev.up.hasChildNodes() ? prev.up : (!prev.down.hasChildNodes() ? prev.down : null);
          if(p) {
            if(p.mayAddCard(card)) return p;
            else prev = null;
          } else prev = prev.prev;
        }
      }
    }
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
    "->foundation": 10,
    "card-revealed": 5,
    "foundation->": -15
  }
};
