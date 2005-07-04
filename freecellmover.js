
// base class for FreeCell, Seahaven Towers and Forty Thieves
var FreeCellGame = {
  __proto__: BaseCardGame,

  // overridden to deal with FreeCellMover (and revealing cards is unnecessary)
  done: function(pile, wasInterrupted) {
    const acts = this.actionsDone, act = acts[acts.length-1];
    gScoreDisplay.value = this.score += act.score;
    
    act.revealedCards = []; //BaseCardGame.undo/redo/restore all require this

    if(!wasInterrupted) return FreeCellMover.step();

    FreeCellMover.interrupt();
    return false;
  },

  doBestMoveForCard: function(card) {
    if(!card.parentNode.mayTakeCard(card)) return null;
    var p = this.getBestMoveForCard(card);
    if(!p) return null;
    var src = card.parentNode.source;
    return !card.nextSibling ? new Move(card, p)
        : new FreeCellMoveAction(card, src, p, this.emptyCells, this.getEmptyPiles(p));
  },

  get emptyCells() {
    var freecells = [];
    const cs = this.cells, num = cs.length;
    for(var i = 0; i != num; i++)
      if(!cs[i].hasChildNodes()) freecells.push(cs[i]);
    return freecells;
  },

  get numEmptyCells() {
    var cells = 0;
    const cs = this.cells, num = cs.length;
    for(var i = 0; i != num; i++) if(!cs[i].hasChildNodes()) cells++;
    return cells;
  },

  // The source and target of a move should not be used as spaces. However this is only called via
  // doBestMoveForCard, where the source won't be empty since it still contains the cards, so only
  // the target need be ignored.
  getEmptyPiles: function(ignore1) {
    var spaces = [];
    const ps = this.piles, num = ps.length;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      if(p!=ignore1 && !p.hasChildNodes()) spaces.push(p);
    }
    return spaces;
  },

  // args. are piles which should not be counted even if empty
  // (typically the source and destination of a card being moved)
  countEmptyPiles: function(ignore1, ignore2) {
    var empty = 0;
    const ps = this.piles, num = ps.length;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      if(p!=ignore1 && p!=ignore2 && !p.hasChildNodes()) empty++
    }
    return empty;
  }
}



function FreeCellMoveAction(card, source, destination, cells, spaces) {
  this.card = card;
  this.source = source;
  this.destination = destination;
  this.cells = cells;
  this.spaces = spaces;
}
FreeCellMoveAction.prototype = {
  action: "pile->pile",
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




// Carries out the sequences of single-card moves necessary to move a run of cards in games like FreeCell
var FreeCellMover = {
  cards: [], // a queue of the remaining cards to move
  tos: [],   // their destinations

  step: function() {
    if(!this.cards.length) return false;
    moveCards(this.cards.shift(), this.tos.shift());
    return true;
  },

  interrupt: function() {
    const froms = this.cards, tos = this.tos, num = froms.length;
    for(var i = 0; i != num; ++i) tos[i].addCards(froms[i]);
    this.cards = [];
    this.tos = [];
  },

  // construct the queue of single-card steps for a move and do the first step
  move: function(card, target, cells, spaces) {
    const sibs = card.parentNode.childNodes; // sibling nodes
    const group = cells.length + 1;
    const numSpaces = spaces.length;
    for(var fst = sibs.length; sibs[--fst]!=card;); // get index of |card| within |sibs|
    const num = sibs.length - fst; // num. of cards to be moved

    if(num <= group) {
      this.queueSimple(sibs, fst, num, target, cells);
    } else if(num <= group+numSpaces) {
      this.queueSimple(sibs, fst, num, target, cells.concat(spaces));
    } else if(num <= group*(numSpaces+1)) {
      this.queueMedium(sibs, fst, num, target, cells, spaces);
    } else { // we know that num<= group*((the sum of ints up to numSpaces)+1))
      this.queueComplex(sibs, fst, num, target, cells, spaces);
    }

    this.step();
  },

  queueStep: function(card, to) {
    this.cards.push(card);
    this.tos.push(to);
  },

  // In the following methods, |cards| a DOMNodeList consisting of the sibling nodes of the cards to
  // be moved. |first| is the index of the highest-numbered card in the run to be moved, num is the
  // number of cards to be moved (which is ==cards.length-first, when called by move(..)).

  // This moving strategy puts num-1 cards into separate cells (some of which may really be spaces),
  // then moves cards[first] to the target, then moves each of the cards put in cells to the target.
  queueSimple: function(cards, first, num, target, cells) {
    const numm = num - 1, last = first + numm;
    for(var i = 0; i != numm; ++i) this.queueStep(cards[last-i], cells[i]);
    this.queueStep(cards[first], target);
    for(i = 1; i != num; ++i) this.queueStep(cards[first+i], target);
  },

  // This fills each space with #cells+1 cards (by using cells) until there are few enough cards that
  // they can be moved to the target only using cells, which it then does.  Then those cards put in
  // spaces are moved to the target too.
  queueMedium: function(cards, first, num, target, cells, spaces) {
    const group = cells.length + 1;
    const last = first + num;
    const limit = first + group;
    //~ dump("  qMedium "+cards[first].str+"@"+first+" to "+cards[last-1].str+"@"+(last-1)+" to "+target.id+", limit="+limit+"\n");
    for(var i = last, s = 0; i > limit; ++s) {
      i -= group;
      //~ dump("  qM calls qS for "+cards[i].str+"@"+i+" and "+group+" to "+spaces[s].id+"\n");
      this.queueSimple(cards, i, group, spaces[s], cells);
    }
    //~ dump("  qM middle call qS: "+cards[first].toString()+" and "+(i-first)+" to target\n");
    this.queueSimple(cards, first, i - first, target, cells);
    while(i != last) {
      //~ dump("  qM calls qS for "+cards[i].toString()+" and "+group+" to target\n");
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
    //~ dump("qComplex "+cards[first].str+"@"+first+" to "+cards[last-1].str+"@"+(last-1)+" to "+target.id+"\n");
    // the num. of cards movable by queueMedium, at any given moment
    var batch = (spaces.length + 1) * group;
    //~ dump("qC initial batch size: "+batch+"\n");
    // suffixes of |spaces| - ss[i] is spaces.slice(i+1), or undefined
    var ss = new Array(spaces.length);

    var s = 0; // space index
    var c = last; // card index

    while(num > batch) {
      dump("qC 1st loop: num="+num+" batch="+batch+"\n");
      var sp = ss[s] = spaces.slice(s+1);
      batch -= group; // we're about to use spaces[s], so must adjust |batch| first
      c -= batch;
      //~ dump(" qC calls qM for"+cards[c].str+"@"+c+" to "+cards[c+batch-1].str+" to "+spaces[s].id+"\n");
      this.queueMedium(cards, c, batch, spaces[s], cells, sp);
      ++s;
      num -= batch;
    }
    //~ dump(" qC: first+num==c ? "+(first+num==c)+"\n");
    //~ dump(" qC calls qM "+cards[first].str+"@"+first+" to "+cards[c-1].str+"@"+(c-1)+" to target ("+target.id+")\n");
    this.queueMedium(cards, first, num, target, cells, sp);

    while(c != last) {
      --s;
      //~ dump(" qC calls qM for"+cards[c].str+"@"+c+" to "+cards[c+batch-1].str+" to target ("+target.id+")\n");
      this.queueMedium(cards, c, batch, target, cells, ss[s]);
      c += batch;
      batch += group;
    }
  }
}

