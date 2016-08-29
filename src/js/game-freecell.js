gGameClasses.freecell = {
  __proto__: FreeCellGame,

  /* Uncomment some of this code to set up the cards for easy testing of freecell animations.
  deal: function() {
    // Move the 6H onto the 7C to test a medium move.
    // this._deal_for_animation_testing([[12, 24, 10, 22, 8, 20, 6, 18, 4, 16, 2, 14]], 3, 5);
    // Move the 8H onto the 9C to test a no-cells complex move.
    // this._deal_for_animation_testing([[12, 24, 10, 22, 8, 20, 6, 18, 4, 16, 2, 14]], 4, 4);
    // Move the 9S into a space to test a 1-cell complex move.
    // this._deal_for_animation_testing([[12, 24, 10, 22, 8, 20, 6, 18, 4, 16, 2, 14]], 3, 4);
    // Move the JS into a space to test another complex move.
    // this._deal_for_animation_testing([[12, 24, 10, 22, 8, 20, 6, 18, 4, 16, 2, 14]], 2, 4);
  },

  _deal_for_animation_testing: function(card_indexes_list, num_cells_to_block, num_piles_to_block) {
    for(let [i, ixs] of card_indexes_list.entries()) {
      let cs = ixs.map(ix => this.allcards[ix]);
      this._deal_cards(cs, 0, this.piles[i], 0, cs.length);
    }
    const remaining = this.allcards.filter(c => !c.pile);
    let to_block = this.cells.slice(0, num_cells_to_block);
    if(num_piles_to_block) to_block = to_block.concat(this.piles.slice(-num_piles_to_block));
    for(let p of to_block) this._deal_cards([remaining.pop()], 0, p, 0, 1);
    this._deal_cards(remaining, 0, this.piles.slice(-1)[0], 0, remaining.length);
  },
  // */

  pileDetails: () => [
    "p", 8, FreeCellPile, FanDownView, 0, [7, 7, 7, 7, 6, 6, 6, 6],
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 4, Cell, View, 0, 0,
  ],

  layoutTemplate: '#<  c c c c    f f f f  >.#<  p p p p p p p p  >.',

  best_destination_for: function(card) {
    const p = find_destination__nearest_legal_pile_preferring_nonempty.call(this, card);
    return p || (card.isLast ? findEmpty(this.cells) : null);
  },

  autoplay: autoplay_default,

  autoplayable_predicate: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,
};


const FreeCellPile = {
  __proto__: _FreeCellPile,
  is_pile: true,

  may_take_card: may_take_descending_alt_colour,

  may_add_card: function(card) {
    if(this.hasCards && !is_next_and_alt_colour(card, this.lastCard)) return false;
    // Check there are enough cells+spaces to perform the move
    if(card.isLast) return true;
    let spaces = gCurrentGame.countEmptyPiles(this, card.pile);
    if(spaces) spaces = spaces * (spaces + 1) / 2;
    const num_can_move = (gCurrentGame.numEmptyCells + 1) * (spaces + 1);
    const num_to_move = card.pile.cards.length - card.index;
    return num_to_move <= num_can_move ? true : 0;
  }
};
