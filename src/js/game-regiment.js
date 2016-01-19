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
      let p = ps[i];
      p.col = i % 8;
      p.reserve = rs[p.col];
    }
  },

  best_destination_for: function(card) {
    const parent = card.pile;
    const ps = parent.isPile ? parent.following() : this.piles, num = ps.length;
    for(let p of ps) if(p.hasCards && p.mayAddCard(card)) return p;

    if(parent.isReserve) for(let p of this.piles) if(!p.hasCard && p.mayAddCard(card)) return p;
    return null;
  },

  autoplay: function() {
    for(let pile of this.piles) {
      if(!pile.hasCards && this.reserves[pile.col].hasCards)
        return new Move(this.reserves[pile.col].lastCard, pile);
    }
    for(let pile of this.aceFoundations) {
      let last = pile.lastCard;
      if(last && last.up && last.twin.pile.isFoundation) {
        let card = last.up.pile.isFoundation ? last.twin.up : last.up;
        if(card.isLast) return new Move(card, pile);
      }
    }
    for(let pile of this.kingFoundations) {
      let last = pile.lastCard;
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
