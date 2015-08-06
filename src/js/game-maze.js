gGameClasses.maze = {
  __proto__: Game,

  pileDetails: () => [
    "p", 54, MazePile, View, 0, 1,
  ],

  layoutTemplate: '#<  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p    >.',

  allcards: null,
  init: function() {
    const cs = this.allcards = makeCards(1, null, range2(1, 13)); // no kings
    cs[53] = cs[52] = cs[51] = cs[50] = cs[49] = cs[48] = null; // 6 spaces instead

    var ps = this.piles;
    ps[53].next = ps[0]; ps[0].prev = ps[53]; // prev/next are not usually circular

    this.aces = [cs[0], cs[12], cs[24], cs[36]];
    this.queens = [cs[11], cs[23], cs[35], cs[47]];
  },

  deal: function(cards) {
    this._deal_cards_with_nulls_for_spaces(cards);
  },

  best_destination_for: function(card) {
    if(card.isAce) {
      var start = card.pile, pile = start.next;
      while(pile !== start && (pile.hasCards || !(pile.next.lastCard === card.up
          || (pile.prev.hasCards && pile.prev.lastCard.isQueen)))) pile = pile.next;
      return !pile.hasCards ? pile : null;
    }
    if(card.isQueen) {
      start = card.pile, pile = start.next;
      while(pile !== start && (pile.hasCards || !(pile.prev.lastCard === card.down
          || (pile.next.hasCards && pile.next.lastCard.isAce)))) pile = pile.next;
      return !pile.hasCards ? pile : null;
    }
    var down = card.down.pile.next, up = card.up.pile.prev;
    return (!down.hasCards && down) || (!up.hasCards && up);
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
