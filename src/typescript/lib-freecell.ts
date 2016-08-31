// Base class for FreeCell, Seahaven Towers and Forty Thieves
class FreeCellRelatedGame extends Game {
  best_action_for(cseq: CardSequence) : Action {
    const card = cseq.first;
    if(!card.pile.may_take_card(card)) return null;
    const dest = this.best_destination_for(cseq);
    if(!dest) return null;
    if(card.isLast) return new Move(card, dest);
    const spaces = this.piles.filter(p => p !== dest && !p.hasCards);
    const cells = this.cells.filter(c => !c.hasCards);
    return new FreeCellMoveAction(card, dest, cells, spaces);
  }

  empty_cell_count() {
    let rv = 0;
    for(let c of this.cells) if(!c.hasCards) ++rv;
    return rv;
  }

  // Args are piles which should not be counted even if empty (typically the source and destination of a card being moved).
  empty_pile_count(ignore1, ignore2) {
    let rv = 0;
    for(let p of this.piles) if(p !== ignore1 && p !== ignore2 && !p.hasCards) ++rv;
    return rv;
  }
};


class FreeCellMoveAction {
  private _anim: AnimationRunArgs;
  private card: Card;
  private source: AnyPile;
  private destination: AnyPile;
  constructor(card, destination, cells, spaces) {
    this._anim = prepare_freecell_move_animation(card, destination, cells, spaces);
    this.card = card;
    this.source = card.pile;
    this.destination = destination;
  }
  perform() {
    this.destination.add_cards(this.card, true); // Don't update view.
    return this._anim;
  }
  undo() {
    this.source.add_cards(this.card);
  }
  redo() {
    this.destination.add_cards(this.card);
  }
};
