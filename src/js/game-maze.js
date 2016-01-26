gGameClasses.maze = {
  __proto__: Game,

  pileDetails: () => [
    "p", 54, MazePile, View, 0, 1,
  ],

  layoutTemplate: '#<  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p    >.',

  init_cards: () => {
    const cs = make_cards(1, null, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]); // no kings
    cs.push(null, null, null, null, null, null); // Add 6 spaces
    return cs;
  },

  init: function() {
    // prev/next are not usually circular
    const ps = this.piles;
    ps[53].next = ps[0];
    ps[0].prev = ps[53];
  },

  deal: function(cards) {
    this._deal_cards_with_nulls_for_spaces(cards);
  },

  best_destination_for: function(card) {
    for(let p of card.pile.following()) if(p.may_add_card(card)) return p;
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

  show_hints_to_empty_piles: true,
};


const MazePile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: _ => true,
  may_add_card: function(card) {
    if(this.hasCards) return false;
    const prev = this.prev.lastCard, next = this.next.lastCard;
    return (prev && maze_allows_adjacent(prev, card)) || (next && maze_allows_adjacent(card, next));
  },
};


function maze_allows_adjacent(a, b) {
  return is_next_in_suit(a, b) || (a.number === 12 && b.number === 1);
};
