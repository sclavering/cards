class ShenzhenGame extends Game {
  static create_layout() {
    return new Layout("#<  c c c    f f f  >.#<  p p p p p p p p  >.", { c: ShenzhenCellView });
  }

  constructor() {
    super();
    this.pile_details = {
      piles: [8, ShenzhenPile, 0, 5],
      foundations: [3, KlondikeFoundation, 0, 0],
      cells: [3, ShenzhenCell, 0, 0],
    };
    this.all_cards = make_cards(1, [Suit.S, Suit.H, Suit.GREEN_CLUBS], [1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 13, 13, 13]);
  }

  foundation_action_for(cseq: CardSequence): Action {
    if(card_number(cseq.first) === 13) return this.foundation_action_for_king(cseq);
    return super.foundation_action_for(cseq);
  }

  foundation_action_for_king(cseq: CardSequence): Action {
    if(!cseq.source.may_take(cseq)) return null;
    // If all four kings of the same type are movable (i.e. at the top of a pile) and there's a free cell (or one of them is in a cell already), we can move them all into the cell.
    const king = cseq.first;
    let empty_target: AnyPile | null = null;
    let king_target: AnyPile | null = null;
    const sources: AnyPile[] = []; // The four piles, or just three if king_target is set.
    for(const cell of this.cells) {
      if(!empty_target && !cell.cards.length) empty_target = cell;
      if(cell.first_card === king) {
        if(king_target) sources.push(cell);
        else king_target = cell;
      }
    }
    for(const p of this.piles) {
      if(p.last_card === king) sources.push(p);
    }
    if(!(king_target ? sources.length === 3 : (empty_target && sources.length === 4))) return;
    const changes: GenericActionChange[] = [];
    const target = king_target || empty_target;
    changes.push({ pile: target, pre: target.cards, post: [king, king, king, king] });
    for(const p of sources) changes.push({ pile: p, pre: p.cards, post: p.cards.slice(0, -1) });
    return new GenericAction(null, changes);
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    const p = this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
    return p || (cseq.is_single ? find_empty(this.cells) : null);
  }

  autoplay() {
    // Similar to Klondike: we can autoplay a card once all the ones that might've been put on it are already on the foundations, except that there's three colours, so we need our own code for it.  As in Klondike, we also always allow autoplaying 2's, because there's no advantage to putting an Ace on a 2, so there's no need to keep 2's down.
    const nums = this.foundations.map(f => f.cards.length ? card_number(f.last_card) : 0);
    const max_common_num = Math.min(nums[0], nums[1], nums[2]);
    const autoplayable_num = Math.max(max_common_num + 1, 2);
    return this.autoplay_using_predicate(cseq => cseq.is_single && card_number(cseq.cards[0]) <= autoplayable_num);
  }

  is_won(): boolean {
    for(const c of this.cells) if(c.cards.length !== 4) return false;
    for(const c of this.foundations) if(c.cards.length !== 9) return false;
    return true;
  }
};
g_game_classes["shenzhen"] = ShenzhenGame;


class ShenzhenPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return is_face_up(cseq.first) && check_consecutive_cards(cseq, is_next_down_different_suit);
  }
  may_add(cseq: CardSequence): boolean {
    return !this.cards.length || is_next_down_different_suit(this.last_card, cseq.first);
  }
};


function is_next_down_different_suit(a: Card, b: Card): boolean {
  return card_number(a) === card_number(b) + 1 && card_suit(a) !== card_suit(b);
};


class ShenzhenCell extends Cell {
  may_take(cseq: CardSequence): boolean {
    return this.cards.length === 1;
  }
  may_add(cseq: CardSequence): boolean {
    return !this.cards.length && cseq.is_single;
  }
};


class ShenzhenCellView extends View {
  update_with(cards: Card[]): void {
    // Make it clear when a Cell it out of the game.
    if(cards.length > 1) return super.update_with([Cards.face_down_of(cards[0])]);
    super.update_with(cards);
  }
};
