class FreeCellGame extends FreeCellRelatedGame {
  static create_layout() {
    return new Layout("#<  c c c c    f f f f  >.#<  p p p p p p p p  >.");
  }

  constructor() {
    super();
    this.pile_details = {
      piles: [8, FreeCellPile, 0, [7, 7, 7, 7, 6, 6, 6, 6]],
      foundations: [4, KlondikeFoundation, 0, 0],
      cells: [4, Cell, 0, 0],
    };
  }

  /* Uncomment some of this code to set up the cards for easy testing of freecell animations.
  protected deal(cards: Card[]): void {
    // Move the 6H onto the 7C to test a medium move.
    // this._deal_for_animation_testing([["", "6H", "5S", "4H", "3S", "2H"], ["7C"]], 3, 4);
    // Move the 8H onto the 9C to test a no-cells complex move.
    // this._deal_for_animation_testing([["", "8H", "7S", "6H", "5S", "4H", "3S", "2H"], ["9C"]], 4, 3);
    // Move the 9S into a space to test a 1-cell complex move.
    // this._deal_for_animation_testing([["", "9S", "8H", "7S", "6H", "5S", "4H", "3S", "2H"]], 3, 4);
    // Move the JS into a space to test another complex move.
    // this._deal_for_animation_testing([["", "11S", "10H", "9S", "8H", "7S", "6H", "5S", "4H", "3S", "2H"]], 2, 4);
  }

  private _deal_for_animation_testing(card_namess: string[][], num_cells_to_block: number, num_piles_to_block: number): void {
    const blocker_card = Cards.face_down_of(Cards.get("13S")); // Arbitrary choice.
    const blocker_cards = [blocker_card];
    card_namess.forEach((names, i) => {
      this.deal_cards(names.map(name => name ? Cards.get(name) : blocker_card), 0, this.piles[i], 0, names.length);
    });
    for(let c of this.cells.slice(-num_cells_to_block)) c.cards = blocker_cards;
    for(let p of this.piles.slice(-num_piles_to_block)) p.cards = blocker_cards;
  }
  // */

  protected best_destination_for(cseq: CardSequence): AnyPile {
    const p = this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
    return p || (cseq.is_single ? findEmpty(this.cells) : null);
  }

  autoplay() {
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two(this.foundations));
  }
};
gGameClasses["freecell"] = FreeCellGame;


class FreeCellPile extends _FreeCellPile {
  may_take(cseq: CardSequence): boolean {
    return may_take_descending_alt_colour(cseq);
  }
  may_add(cseq: CardSequence): boolean | 0 {
    const card = cseq.first;
    if(this.cards.length && !is_next_and_alt_colour(card, this.lastCard)) return false;
    // Check there are enough cells+spaces to perform the move
    if(cseq.is_single) return true;
    let spaces = (this.owning_game as FreeCellRelatedGame).empty_pile_count(this, cseq.source);
    if(spaces) spaces = spaces * (spaces + 1) / 2;
    const num_can_move = ((this.owning_game as FreeCellRelatedGame).empty_cell_count() + 1) * (spaces + 1);
    return cseq.count <= num_can_move ? true : 0;
  }
};
