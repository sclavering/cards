gGameClasses.maze = {
  __proto__: Game,

  pileDetails: () => [
    "p", 54, MazePile, View, 0, 1,
  ],

  layoutTemplate: '#<  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p    >.',

  required_cards: null,
  init: function() {
    const cs = this.allcards = makeCards(1, null, range2(1, 13)); // no kings
    cs[53] = cs[52] = cs[51] = cs[50] = cs[49] = cs[48] = null; // 6 spaces instead

    // prev/next are not usually circular
    const ps = this.piles;
    ps[53].next = ps[0];
    ps[0].prev = ps[53];
  },

  deal: function(cards) {
    this._deal_cards_with_nulls_for_spaces(cards);
  },

  best_destination_for: function(card) {
    for(let p of card.pile.following()) if(p.mayAddCard(card)) return p;
    return null;
  },

  // Autoplay not used

  is_won: function() {
    var pile = this.piles[0], first = pile;
    do {
      var next = pile.next, c1 = pile.lastCard, c2 = next.lastCard;
      if(!c1) {
        if(c2 && !c2.isAce) return false;
      } else if(!c2) {
        if(!c1.isQueen) return false;
      } else {
        if(!(c1.up === c2 || (c1.isQueen && c2.isAce))) return false;
      }
      pile = next;
    } while(pile !== first);
    return true;
  }
};


const MazePile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: yes,
  mayAddCard: function(card) {
    if(this.hasCards) return false;
    var prev = this.prev.lastCard, next = this.next.lastCard;
    return (card.isQueen && next && next.isAce)
        || (card.isAce && prev && prev.isQueen)
        || (prev && prev === card.down)
        || (next && next === card.up);
  }
};
