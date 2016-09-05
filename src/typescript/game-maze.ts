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

  protected init() {
    // prev/next are not usually circular
    const ps = this.piles;
    ps[53].next = ps[0];
    ps[0].prev = ps[53];
  }

  protected deal(cards: Card[]): void {
    cards.forEach((c, ix) => { if(c) this.piles[ix].cards = [c]; });
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    for(let p of cseq.source.following()) if(p.may_add(cseq)) return p;
    return null;
  }

  is_won(): boolean {
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


class MazePile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return true;
  }
  may_add(cseq: CardSequence): boolean {
    if(this.cards.length) return false;
    const prev = this.prev.lastCard, next = this.next.lastCard;
    return (prev && maze_allows_adjacent(prev, cseq.first)) || (next && maze_allows_adjacent(cseq.first, next));
  }
};


function maze_allows_adjacent(a: Card, b: Card): boolean {
  return is_next_in_suit(a, b) || (a.number === 12 && b.number === 1);
};
