// Base class for FreeCell, Seahaven Towers and Forty Thieves
class FreeCellRelatedGame extends Game {
  best_action_for(cseq: CardSequence): Action {
    if(!cseq.source.may_take(cseq)) return null;
    const dest = this.best_destination_for(cseq);
    if(!dest) return null;
    if(cseq.is_single) return new Move(cseq, dest);
    const spaces = this.piles.filter(p => p !== dest && !p.hasCards);
    const cells = this.cells.filter(c => !c.hasCards);
    return new FreeCellMoveAction(cseq, dest, cells, spaces);
  }

  empty_cell_count(): number {
    let rv = 0;
    for(let c of this.cells) if(!c.hasCards) ++rv;
    return rv;
  }

  // Args are piles which should not be counted even if empty (typically the source and destination of a card being moved).
  empty_pile_count(ignore1?: AnyPile, ignore2?: AnyPile): number {
    let rv = 0;
    for(let p of this.piles) if(p !== ignore1 && p !== ignore2 && !p.hasCards) ++rv;
    return rv;
  }
};


class FreeCellMoveAction extends GenericAction {
  constructor(cseq: CardSequence, destination: AnyPile, cells: AnyPile[], spaces: AnyPile[]) {
    super(prepare_freecell_move_animation(cseq, destination, cells, spaces), [
      { pile: cseq.source, pre: cseq.source.cards, post: cseq.source.cards.slice(0, cseq.index) },
      { pile: destination, pre: destination.cards, post: destination.cards.concat(cseq.cards) },
    ]);
  }
};
