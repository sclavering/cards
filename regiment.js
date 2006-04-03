Games.regiment = {
  __proto__: BaseCardGame,

  layoutTemplate: "v[1f1f1f1f2f1f1f1f1]  [1p1p1p1p1p1p1p1p1] [1r1r1r1r1r1r1r1r1] [1p1p1p1p1p1p1p1p1]",
  dealTemplate: "P 0,1; R 10,1",
  pileType: Pile, // xxx ew!
  pileLayout: Layout,

  cards: 2,

  init: function() {
    const cs = this.cards = makeDecks(2);
    const fs = this.foundations, ps = this.piles, rs = this.reserves;
    const afs = this.aceFoundations = fs.slice(0,4);
    const kfs = this.kingFoundations = fs.slice(4,8);

    for(var i = 0; i != 8; i++) {
      rs[i].up = ps[i];
      rs[i].down = ps[i+8];
      rs[i].col = i;
    }

    for(i = 0; i != 4; i++) {
      afs[i].mayAddCard = this.mayAddCardToAceFoundation;
      kfs[i].mayAddCard = this.mayAddCardToKingFoundation;
    }

    for(i = 0; i != 16; i++) {
      var p = ps[i], col = p.col = i % 8;
      p.reserve = rs[col];
      p.isPile = true;
      p.mayTakeCard = this.mayTakeCardFromPile;
      p.mayAddCard = this.mayAddCardToPile;
      p.following = ps.slice(i+1).concat(ps.slice(0, i));
    }

    const acepos = [0, 13, 26, 39, 52, 65, 78, 91];
    const as = this.aces = new Array(8);
    const ks = this.kings = new Array(8);
    for(i = 0; i != 8; i++) as[i] = cs[acepos[i]], ks[i] = cs[acepos[i]+12];
  },

  mayTakeCardFromPile: mayTakeSingleCard,

  mayAddCardToAceFoundation: function(card) {
    var last = this.lastChild, twin = card.twin;
    // must not start a second ace foundation for a suit
    if(card.isAce) return !last && !(twin.parentNode.isFoundation && !twin.previousSibling);
    return last && card.number==last.upNumber && card.suit==last.suit;
  },

  mayAddCardToKingFoundation: function(card) {
    var last = this.lastChild, twin = card.twin;
    if(card.isKing) return !last && !(twin.parentNode.isFoundation && !twin.previousSibling);
    return last && last.number==card.upNumber && card.suit==last.suit;
  },

  mayAddCardToPile: function(card) {
    // piles are built up or down (or both) within suit
    var l = this.lastChild;
    if(l) return card.suit==l.suit && (l.number==card.upNumber || card.number==l.upNumber);

    // empty piles must be filled from the closest reserve pile
    var source = card.parentNode.source;
    if(!source.isReserve) return false;

    var reserve = this.reserve;
    if(reserve==source) return true;

    if(reserve.hasCards) return false;

    var prev = reserve.prev, prevDist = 1;
    while(prev && !prev.hasCards && prev!=source) prev = prev.prev, prevDist++;
    var next = reserve.next, nextDist = 1;
    while(next && !next.hasCards && next!=source) next = next.next, nextDist++;

    // if trying to move from a reserve to the right
    if(source.col > this.col) return next==source && (!prev || prevDist>=nextDist);
    return prev==source && (!next || nextDist>=prevDist);
  },

  getHints: function() {
    for(var i = 0; i != 8; i++) this.addHintsFor(this.reserves[i].lastChild);
    for(i = 0; i != 16; i++) this.addHintsFor(this.piles[i].lastChild);
  },

  getBestDestinationFor: function(card) {
    const parent = card.parentNode;
    const ps = parent.isPile ? parent.following : this.piles, num = ps.length;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      if(p.hasCards && p.mayAddCard(card)) return p;
    }
    // look for an empty pile to move the card to
    if(!parent.isReserve) return null;
    var prev = parent.prev, next = parent.next;

    while(prev || next) {
      if(next) {
        if(next.hasCards) next = null;
        else {
          p = !next.up.hasCards ? next.up : (!next.down.hasCards ? next.down : null);
          if(p) {
            if(p.mayAddCard(card)) return p;
            else next = null; // another reserve is closer to p; it will be closer to any pile right of p too
          } else next = next.next;
        }
      }
      if(prev) {
        if(prev.hasCards) prev = null;
        else {
          p = !prev.up.hasCards ? prev.up : (!prev.down.hasCards ? prev.down : null);
          if(p) {
            if(p.mayAddCard(card)) return p;
            else prev = null;
          } else prev = prev.prev;
        }
      }
    }
    return null;
  },

  autoplay: function(pileWhichHasHadCardsRemoved) {
    var i, pile, last, card;
    if(pileWhichHasHadCardsRemoved) {
      pile = pileWhichHasHadCardsRemoved;
      if(pile.isPile && !pile.hasCards && this.reserves[pile.col].hasCards)
        return new Move(this.reserves[pile.col].lastChild, pile);
    }

    for(i = 0; i != 4; i++) {
      pile = this.foundations[i], last = pile.lastChild;
      if(last && last.up && last.twin.parentNode.isFoundation) {
        card = last.up.parentNode.isFoundation ? last.twin.up : last.up;
        if(card.isLast) return new Move(card, pile);
      }
    }
    for(i = 4; i != 8; i++) {
      pile = this.foundations[i], last = pile.lastChild;
      if(last && last.down && last.twin.parentNode.isFoundation) {
        card = last.down.parentNode.isFoundation ? last.twin.down : last.down;
        if(card.isLast) return new Move(card, pile);
      }
    }
    return null;
  },

  isWon: "13 cards on each foundation"
};
