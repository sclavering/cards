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

  init_cards: () => make_cards(2),

  init: function() {
    const cs = this.allcards;
    const fs = this.foundations, ps = this.piles, rs = this.reserves;
    this.aceFoundations = fs.slice(0,4);
    this.kingFoundations = fs.slice(4,8);

    for(let i = 0; i !== 8; i++) rs[i].col = i;

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

    if(parent.isReserve) for(let p of this.piles) if(!p.hasCards && p.mayAddCard(card)) return p;
    return null;
  },

  autoplay: function() {
    for(let pile of this.piles)
      if(!pile.hasCards && this.reserves[pile.col].hasCards)
        return new Move(this.reserves[pile.col].lastCard, pile);
    return this._autoplay();
  },

  _autoplay: autoplay_default,

  // If the ace- and king-foundation for a suit have reached the same number it's fine to autoplay anything to both of them.  Otherwise nothing is autoplayable.  (The edge case, where e.g. the ace-foundation is up to a 10 and the king-foundation down to a jack, is not autoplayable because e.g. the user might want to move the 10 across in order to put up the other 9.)
  autoplayable_numbers: function() {
    const ace_nums = {}, king_nums = {};
    for_each_top_card(this.aceFoundations, c => ace_nums[c.suit] = c.number);
    for_each_top_card(this.kingFoundations, c => king_nums[c.suit] = c.number);
    const rv = { "S": 0, "H": 0, "D": 0, "C": 0 };
    for(let k in rv) if(ace_nums[k] && king_nums[k] && ace_nums[k] >= king_nums[k]) rv[k] = 13;
    return rv;
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
    if(l) return card.suit === l.suit && (l.number === card.number + 1 || l.number === card.number - 1);

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
    if(!this.hasCards) return card.isAce && !includes_pile_starting_with_suit(this.following(), card.suit);
    return is_next_in_suit(this.lastCard, card);
  },
};

const RegimentKingFoundation = {
  __proto__: WorryingBackFoundation,
  mayAddCard: function(card) {
    if(!this.hasCards) return card.isKing && !includes_pile_starting_with_suit(this.following(), card.suit);
    return is_next_in_suit(card, this.lastCard);
  },
};
