class MazeGame extends Game {
  static create_layout() {
    return new Layout("#<  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p p  ><  p p p p p p p p p p    >.", { p: View });
  }

  constructor() {
    super();
    this.all_cards = make_cards(1, null, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]); // no kings
    this.all_cards.push(null, null, null, null, null, null); // Add 6 spaces
    this.pile_details = {
      piles: [54, MazePile, 0, 1],
    };
    this.show_hints_to_empty_piles = true;
  }

  init() {
    // prev/next are not usually circular
    const ps = this.piles;
    ps[53].next = ps[0];
    ps[0].prev = ps[53];
  }

  deal(cards) {
    this._deal_cards_with_nulls_for_spaces(cards);
  }

  best_destination_for(cseq) {
    for(let p of cseq.source.following()) if(p.may_add_card(cseq.first)) return p;
    return null;
  }

  is_won() {
    const first = this.piles.find(x => x.hasCards);
    let p = first;
    do {
      let next = p.following().find(x => x.hasCards);
      if(!maze_allows_adjacent(p.firstCard, next.firstCard)) return false;
      p = next;
    } while(p !== first);
    return true;
  }
};
gGameClasses["maze"] = MazeGame;


class MazePile extends _Pile {
  may_take_card(card) {
    return true;
  }
  may_add_card(card) {
    if(this.hasCards) return false;
    const prev = this.prev.lastCard, next = this.next.lastCard;
    return (prev && maze_allows_adjacent(prev, card)) || (next && maze_allows_adjacent(card, next));
  }
};


function maze_allows_adjacent(a, b) {
  return is_next_in_suit(a, b) || (a.number === 12 && b.number === 1);
};
