// base class for FreeCell, Seahaven Towers and Forty Thieves
const FreeCellGame = {
  __proto__: Game,

  getBestActionFor: function(card) {
    if(!card.pile.mayTakeCard(card)) return null;
    const dest = this.best_destination_for(card);
    if(!dest) return null;
    return new Move(card, dest);
    /* FreeCellMoveAction doesn't work correctly at the moment, so don't try using it
    if(card.isLast) return new Move(card, dest);
    const spaces = [p for each(p in this.piles) if(p !== dest && !p.hasCards)];
    const cells = [c for each(c in this.cells) if(!c.hasCards)];
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
  }
}



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
  }
}




// Carries out the sequences of single-card moves necessary to move a run of
// cards in games like FreeCell.  Ideally it would just schedule them all as
// animations and only changes the Pile objects' state to reflect the final
// position, but for historical reasons it still adjusts the piles for each
// single-card move.
const FreeCellMover = {
  _queue: [],  // queue of [card, pile] pairs

  move: function(card, target, cells, spaces) {
    this.queue(card, target, cells, spaces);
    this.step();
  },

  step: function() {
    const self = FreeCellMover;
    if(!self._queue.length) return true;
    const el = self._queue.shift();
    // call done after the final step
    const callback = self._queue.length ? self.step : done;
    moveCards(el[0], el[1], callback);
    return true;
  },

  interrupt: function() {
    if(!this._queue.length) return;
    for(let el of this._queue) el[1].addCards(el[0]);
    this._queue = [];
  },

  // construct the queue of single-card steps for a move and do the first step
  queue: function(card, target, cells, spaces) {
    const sibs = card.pile.cards;
    const group = cells.length + 1;
    const numSpaces = spaces.length;
    for(var fst = sibs.length; sibs[--fst] !== card; ) {} // get index of |card| within |sibs|
    const num = sibs.length - fst; // num. of cards to be moved

    if(num <= group) {
      this.queueSimple(sibs, fst, num, target, cells);
    } else if(num <= group + numSpaces) {
      this.queueSimple(sibs, fst, num, target, cells.concat(spaces));
    } else if(num <= group * (numSpaces + 1)) {
      this.queueMedium(sibs, fst, num, target, cells, spaces);
    } else { // we know that num<= group*((the sum of ints up to numSpaces)+1))
      this.queueComplex(sibs, fst, num, target, cells, spaces);
    }
  },

  queueStep: function(card, to) {
    this._queue.push([card, to]);
  },

  // In the following methods, |cards| a DOMNodeList consisting of the sibling nodes of the cards to
  // be moved. |first| is the index of the highest-numbered card in the run to be moved, num is the
  // number of cards to be moved (which is ==cards.length-first, when called by move(..)).

  // This moving strategy puts num-1 cards into separate cells (some of which may really be spaces),
  // then moves cards[first] to the target, then moves each of the cards put in cells to the target.
  queueSimple: function(cards, first, num, target, cells) {
    const numm = num - 1, last = first + numm;
    for(let i = 0; i !== numm; ++i) this.queueStep(cards[last - i], cells[i]);
    this.queueStep(cards[first], target);
    for(let i = 1; i !== num; ++i) this.queueStep(cards[first + i], target);
  },

  // This fills each space with #cells+1 cards (by using cells) until there are few enough cards that
  // they can be moved to the target only using cells, which it then does.  Then those cards put in
  // spaces are moved to the target too.
  queueMedium: function(cards, first, num, target, cells, spaces) {
    const group = cells.length + 1;
    const last = first + num;
    const limit = first + group;
    for(var i = last, s = 0; i > limit; ++s) {
      i -= group;
      this.queueSimple(cards, i, group, spaces[s], cells);
    }
    this.queueSimple(cards, first, i - first, target, cells);
    while(i !== last) {
      this.queueSimple(cards, i, group, target, cells);
      i += group;
    }
  },

  // This fills all spaces with #cells+1 cards like above, then packs them all into a single space.
  // This process is repeated (with ever fewer spaces) until there are few enough cards left to move
  // them to the target using only cells
  queueComplex: function(cards, first, num, target, cells, spaces) {
    const group = cells.length + 1;
    const last = first + num;
    // the num. of cards movable by queueMedium, at any given moment
    var batch = (spaces.length + 1) * group;
    // suffixes of |spaces| - ss[i] is spaces.slice(i+1), or undefined
    var ss = new Array(spaces.length);

    var s = 0; // space index
    var c = last; // card index

    while(num > batch) {
      let sp = ss[s] = spaces.slice(s + 1);
      batch -= group; // we're about to use spaces[s], so must adjust |batch| first
      c -= batch;
      this.queueMedium(cards, c, batch, spaces[s], cells, sp);
      ++s;
      num -= batch;
    }
    this.queueMedium(cards, first, num, target, cells, sp);

    while(c !== last) {
      --s;
      this.queueMedium(cards, c, batch, target, cells, ss[s]);
      c += batch;
      batch += group;
    }
  }
}

