
// base class for FreeCell, Seahaven Towers and Forty Thieves
var FreeCellGame = {
  __proto__: BaseCardGame,

  get insufficientSpacesMessage() {
    var ths = FreeCellGame;
    delete ths.insufficientSpacesMessage;
    return ths.insufficientSpacesMessage = document.documentElement.getAttribute("insufficientSpacesMessage");
  },

  // note: the return value of 0 from mayAddCard is used to indicate the move is legal, but needs more cells/spaces
  attemptMove: function(card, destination) {
    var may = destination.mayAddCard(card);
    if(may) return this.moveTo(card, destination, true);
    if(may===0) showMessage("notEnoughSpaces")
    return false;
  },

  doBestMoveForCard: function(card) {
    if(!card.parentNode.mayTakeCard(card)) return;
    var p = this.getBestMoveForCard(card);
    if(!p) return;
    var src = card.parentNode.source;
    var act = !card.nextSibling ? new MoveAction(card, src, p)
        : new FreeCellMoveAction(card, src, p, this.emptyCells, this.getEmptyPiles(p));
    this.doAction(act);
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
  },

  // overriden because we want to call FreeCellMover.step(), and don't need to reveal cards
  autoplay: function() {
    if(FreeCellMover.step() || this.autoplayMove()) return true;
    if(!Game.hasBeenWon()) return false;
    showGameWon();
    return true;
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
    //~ dump("  qMedium "+cards[first].toString()+" to "+cards[last-1].toString()+" ("+num+") to "+target.id+"\n");
    //~ dump("  qM limit="+limit+"\n");
    for(var i = last, s = 0; i > limit; ++s) {
      i -= group;
      //~ dump("  qM calls qS for"+i+"="+cards[i].toString()+" and "+group+" to "+spaces[s].id+"\n");
      this.queueSimple(cards, i, group, spaces[s], cells);
    }
    //~ dump("  qM call qS for "+cards[first].toString()+" and "+(i-first)+" to target\n");
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
    //~ dump("queueComplex: "+cards[first].toString()+" to "+target.id+"\n");
    const ss = new Array(spaces.length); // ss[i]==spaces.slice(i)
    const ns = new Array(spaces.length); // ns[i] is the num of cards packed into spaces[i]
    const group = cells.length + 1;
    const last = first + num;
    for(var j = 0, i = last; num > group; ++j) {
      var s = ss[j] = spaces.slice(j+1);
      var n = ns[j] = s.length * group + 1;
      i -= n;
      //~ dump("qC calling qM for "+cards[i].toString()+" and "+n+" to "+spaces[j].id+"\n");
      this.queueMedium(cards, i, n, spaces[j], cells, s);
      num -= n;
    }
    //~ dump("qC calling qS! for "+cards[first].toString()+" and "+num+" to target\n");
    this.queueSimple(cards, first, num, target, cells);
    for(--j; j != -1; --j) {
      //~ dump("qC calling qM for "+cards[i].toString()+" and "+ns[j]+" to target\n");
      this.queueMedium(cards, i, ns[j], target, cells, ss[j]);
      i += ns[j];
    }
  }
}

