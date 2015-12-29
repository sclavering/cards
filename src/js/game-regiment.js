gGameClasses.regiment = {
  __proto__: Game,

  pileDetails: () => [
    "p", 16, RegimentPile, FoundationSlideView, 0, 1,
    "r", 8, Reserve, FoundationSlideView, 10, 1,
    // ace+king foundations
    "a", 4, RegimentAceFoundation, FoundationSlideView, 0, 0,
    "k", 4, RegimentKingFoundation, FoundationSlideView, 0, 0,
  ],

  layoutTemplate: '#<    a a a a   k k k k    >.#<   p p p p p p p p   ><   r r r r r r r r><   p p p p p p p p>.',

  required_cards: [2],

  init: function() {
    const cs = this.allcards;
    const fs = this.foundations, ps = this.piles, rs = this.reserves;
    this.aceFoundations = fs.slice(0,4);
    this.kingFoundations = fs.slice(4,8);

    for(let i = 0; i !== 8; i++) {
      rs[i].up = ps[i];
      rs[i].down = ps[i + 8];
      rs[i].col = i;
    }

    for(let i = 0; i !== 16; i++) {
      var p = ps[i], col = p.col = i % 8;
      p.reserve = rs[col];
    }

    this.aces = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
    this.kings = [cs[12], cs[25], cs[38], cs[51], cs[64], cs[77], cs[90], cs[103]];
  },

  best_destination_for: function(card) {
    const parent = card.pile;
    const ps = parent.isPile ? parent.following() : this.piles, num = ps.length;
    for(let i = 0; i !== num; i++) {
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

  autoplay: function() {
    for(let pile of this.piles) {
      if(!pile.hasCards && this.reserves[pile.col].hasCards)
        return new Move(this.reserves[pile.col].lastCard, pile);
    }
    const afs = this.aceFoundations, kfs = this.kingFoundations;
    for(let i = 0; i !== 4; i++) {
      let pile = afs[i], last = pile.lastCard;
      if(last && last.up && last.twin.pile.isFoundation) {
        let card = last.up.pile.isFoundation ? last.twin.up : last.up;
        if(card.isLast) return new Move(card, pile);
      }
    }
    for(let i = 0; i !== 4; i++) {
      let pile = kfs[i], last = pile.lastCard;
      if(last && last.down && last.twin.pile.isFoundation) {
        let card = last.down.pile.isFoundation ? last.twin.down : last.down;
        if(card.isLast) return new Move(card, pile);
      }
    }
    return null;
  },
};


const RegimentPile = {
  __proto__: Pile,
  isPile: true,
  reserve: null,

  mayTakeCard: mayTakeSingleCard,

  mayAddCard: function(card) {
    if(card.pile === this) return false;
    // piles are built up or down (or both) within suit
    const l = this.lastCard;
    if(l) return card.suit === l.suit && (l.number === card.upNumber || card.number === l.upNumber);

    // empty piles must be filled from the closest reserve pile
    const source = card.pile;
    if(!source.isReserve) return false;

    const reserve = this.reserve;
    if(reserve === source) return true;

    if(reserve.hasCards) return false;

    var prev = reserve.prev, prevDist = 1;
    while(prev && !prev.hasCards && prev !== source) prev = prev.prev, prevDist++;
    var next = reserve.next, nextDist = 1;
    while(next && !next.hasCards && next !== source) next = next.next, nextDist++;

    // if trying to move from a reserve to the right
    if(source.col > this.col) return next === source && (!prev || prevDist >= nextDist);
    return prev === source && (!next || nextDist >= prevDist);
  }
};

const RegimentAceFoundation = {
  __proto__: WorryingBackFoundation,
  mayAddCard: function(card) {
    const last = this.lastCard, twin = card.twin;
    // must not start a second ace foundation for a suit
    if(card.isAce) return !last && !(twin.pile.isFoundation && twin.isFirst);
    return last && card.number === last.upNumber && card.suit === last.suit;
  }
};

const RegimentKingFoundation = {
  __proto__: WorryingBackFoundation,
  mayAddCard: function(card) {
    const last = this.lastCard, twin = card.twin;
    if(card.isKing) return !last && !(twin.pile.isFoundation && twin.isFirst);
    return last && last.number === card.upNumber && card.suit === last.suit;
  }
};
