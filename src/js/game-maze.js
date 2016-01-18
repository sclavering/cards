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

  is_won: function() {
    const first = this.piles.find(x => x.hasCards);
    let p = first;
    do {
      let next = p.following().find(x => x.hasCards);
      if(!maze_allows_adjacent(p.firstCard, next.firstCard)) return false;
      p = next;
    } while(p !== first);
    return true;
  },
};


const MazePile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: yes,
  mayAddCard: function(card) {
    if(this.hasCards) return false;
    const prev = this.prev.lastCard, next = this.next.lastCard;
    return (prev && maze_allows_adjacent(prev, card)) || (next && maze_allows_adjacent(card, next));
  },
};


function maze_allows_adjacent(a, b) {
  return a.up === b || (a.isQueen && b.isAce);
};
