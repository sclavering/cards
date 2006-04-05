Games.regiment = {
  __proto__: BaseCardGame,

  layoutTemplate: "v[1a1a1a1a2k1k1k1k1]  [1p1p1p1p1p1p1p1p1] [1r1r1r1r1r1r1r1r1] [1p1p1p1p1p1p1p1p1]",
  aceFoundationType: RegimentAceFoundation,
  kingFoundationType: RegimentKingFoundation,

  dealTemplate: "P 0,1; R 10,1",
  pileType: RegimentPile,
  pileLayout: Layout,

  cards: 2,

  init: function() {
    const cs = this.cards = makeDecks(2);
    const fs = this.foundations, ps = this.piles, rs = this.reserves;
    this.aceFoundations = fs.slice(0,4);
    this.kingFoundations = fs.slice(4,8);

    for(var i = 0; i != 8; i++) {
      rs[i].up = ps[i];
      rs[i].down = ps[i+8];
      rs[i].col = i;
    }

    for(i = 0; i != 16; i++) {
      var p = ps[i], col = p.col = i % 8;
      p.reserve = rs[col];
      p.following = ps.slice(i+1).concat(ps.slice(0, i));
    }

    this.aces = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
    this.kings = [cs[12], cs[25], cs[38], cs[51], cs[64], cs[77], cs[90], cs[103]];
  },

  getHints: function() {
    for(var i = 0; i != 8; i++) this.addHintsFor(this.reserves[i].lastCard);
    for(i = 0; i != 16; i++) this.addHintsFor(this.piles[i].lastCard);
  },

  getBestDestinationFor: function(card) {
    const parent = card.pile;
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
        return new Move(this.reserves[pile.col].lastCard, pile);
    }

    for(i = 0; i != 4; i++) {
      pile = this.foundations[i], last = pile.lastCard;
      if(last && last.up && last.twin.pile.isFoundation) {
        card = last.up.pile.isFoundation ? last.twin.up : last.up;
        if(card.isLast) return new Move(card, pile);
      }
    }
    for(i = 4; i != 8; i++) {
      pile = this.foundations[i], last = pile.lastCard;
      if(last && last.down && last.twin.pile.isFoundation) {
        card = last.down.pile.isFoundation ? last.twin.down : last.down;
        if(card.isLast) return new Move(card, pile);
      }
    }
    return null;
  },

  isWon: "13 cards on each foundation"
};
