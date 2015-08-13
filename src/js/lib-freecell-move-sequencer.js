// Base class for FreeCell, Seahaven Towers and Forty Thieves
const FreeCellGame = {
  __proto__: Game,

  getBestActionFor: function(card) {
    if(!card.mayTake) return null;
    const dest = this.best_destination_for(card);
    if(!dest) return null;
    return new Move(card, dest);
    /* FreeCellMoveAction doesn't work correctly at the moment, so don't try using it
    if(card.isLast) return new Move(card, dest);
    const spaces = [for(p of this.piles) if(p !== dest && !p.hasCards) p];
    const cells = [for(c of this.cells) if(!c.hasCards) c];
    return new FreeCellMoveAction(card, dest, cells, spaces);
    */
  },

  get numEmptyCells() {
    var cells = 0;
    const cs = this.cells, num = cs.length;
    for(var i = 0; i !== num; i++) if(!cs[i].hasCards) cells++;
    return cells;
  },

  // args. are piles which should not be counted even if empty
  // (typically the source and destination of a card being moved)
  countEmptyPiles: function(ignore1, ignore2) {
    var empty = 0;
    const ps = this.piles, num = ps.length;
    for(var i = 0; i !== num; i++) {
      var p = ps[i];
      if(p !== ignore1 && p !== ignore2 && !p.hasCards) empty++
    }
    return empty;
  },
};


function FreeCellMoveAction(card, destination, cells, spaces) {
  this.card = card;
  this.source = card.pile;
  this.destination = destination;
  this.cells = cells;
  this.spaces = spaces;
}
FreeCellMoveAction.prototype = {
  synchronous: false,

  perform: function() {
    FreeCellMover.move(this.card, this.destination, this.cells, this.spaces);
  },
  undo: function() {
    this.source.addCards(this.card);
  },
  redo: function() {
    this.destination.addCards(this.card);
  },
};
