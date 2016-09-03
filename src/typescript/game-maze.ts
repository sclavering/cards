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

  deal(cards: Card[]): void {
    this._deal_cards_with_nulls_for_spaces(cards);
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    for(let p of cseq.source.following()) if(p.may_add_card(cseq.first)) return p;
    return null;
  }

  public is_won(): boolean {
    let first: Card = null;
    let prev: Card = null;
    for(let p of this.piles) {
      const c = p.firstCard;
      if(!c) continue;
      if(!first) {
        first = prev = c;
        continue;
      }
      if(!maze_allows_adjacent(prev, c)) return false;
      prev = c;
    }
    if(!maze_allows_adjacent(prev, first)) return false;
    return true;
  }
};
gGameClasses["maze"] = MazeGame;


class MazePile extends _Pile {
  may_take(cseq: CardSequence): boolean {
    return true;
  }
  may_add_card(card: Card): boolean {
    if(this.hasCards) return false;
    const prev = this.prev.lastCard, next = this.next.lastCard;
    return (prev && maze_allows_adjacent(prev, card)) || (next && maze_allows_adjacent(card, next));
  }
};


function maze_allows_adjacent(a: Card, b: Card): boolean {
  return is_next_in_suit(a, b) || (a.number === 12 && b.number === 1);
};
