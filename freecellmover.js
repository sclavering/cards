
// base class for FreeCell, Seahaven Towers and Forty Thieves
var FreeCellGame = {
  __proto__: BaseCardGame,

  get insufficientSpacesMessage() {
    var ths = FreeCellGame;
    delete ths.insufficientSpacesMessage;
    return ths.insufficientSpacesMessage = document.documentElement.getAttribute("insufficientSpacesMessage");
  },

  // dontShowSteps is freecell/towers specific
  moveTo: function(card, target, dontShowSteps) {
    var source = card.parentNode.source;
    if(!dontShowSteps && target.isNormalPile && card.nextSibling) {
      this.doAction(new FreeCellMoveAction(card, source, target, this.emptyCells, this.getEmptyPiles(target)));
    } else {
      var action = new MoveAction(card,source,target);
      this.doAction(action);
    }
    return true;
  },

  // note: the return value of 0 from mayAddCard is used to indicate the move is legal, but needs more cells/spaces
  attemptMove: function(card, destination) {
    var may = destination.mayAddCard(card);
    if(may) return this.moveTo(card, destination, true);
    if(may===0) showMessage("notEnoughSpaces")
    return false;
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

  get emptyCell() {
    const cs = this.cells, num = cs.length;
    for(var i = 0; i != num; i++) if(!cs[i].hasChildNodes()) return cs[i];
    return null;
  },

  // the target of a move can't also be used as a space
  getEmptyPiles: function(pileToIgnore) {
    var spaces = [];
    const ps = this.piles, num = ps.length;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      if(p!=pileToIgnore && !p.hasChildNodes()) spaces.push(p);
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

  // perform the next move in the current sequence (if any)
  step: function() {
    if(!this.cards.length) return false;
    moveCards(this.cards.shift(), this.tos.shift());
    return true;
  },

  // enqueue and start a move
  move: function(card, target, freeCells, spaces) {
    // groupsize is the number of cards which can be moved without filling spaces
    var groupsize = freeCells.length+1;
    var numSpaces = spaces.length;
    var sumToNumSpaces = numSpaces * (numSpaces + 1) / 2;
    // work out how many cards are to move
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;

    // decide which move strategy to employ dependent on number of cards, free cells, and spaces
    var last = card.parentNode.lastChild;
    if(numToMove <= groupsize) {
      // just move each card to a cell then pull them off again
      this.queueSimpleMove(card, last, target, freeCells);
    } else if(numToMove <= groupsize+numSpaces) {
      // when numToMove <= numSpaces+numFreeCells+1 it looks more natural to use the spaces just like cells
      this.queueSimpleMove(card, last, target, freeCells.concat(spaces));
    } else if(numToMove <= groupsize*(numSpaces+1)) {
      // move groups of (numFreeCells+1) through cells to each space, then pull back
      // complexMove would most likely work, but would look odd as unnecessary work would be done
      this.queueMediumMove(card, last, target, freeCells, spaces, numToMove);
    } else { // if(numToMove <= groupsize*(sumToNumSpaces+1))
      // run the last type of move, then consolidate all into one pile,
      // then run this kind again, until all but |card| have been moved
      this.queueComplexMove(card, last, target, freeCells, spaces, numToMove);
    }

    this.step();
  },

  queueStep: function(card, to) {
    this.cards.push(card);
    this.tos.push(to);
  },

  // append to |moves| the seq of moves that uses only the |cells| as intermediate storage
  // (which might includes some spaces as well as cells), and moves the cards between
  // |first| and |last| inclusive to |target|
  queueSimpleMove: function(first, last, target, cells) {
    var current, i = 0;
    // move cards on top of |first| (up to |last|) to cells
    for(current = last; current!=first; current = current.previousSibling)
      this.queueStep(current, cells[i++]);
    // move |first| to |target|
    this.queueStep(first, target);
    // move cards back from cells
    for(current = first.nextSibling; current!=last.nextSibling; current = current.nextSibling)
      this.queueStep(current, target);
  },

  // create a queue of moves that uses the cells to fill each space with c+1 cards
  queueMediumMove: function(first, last, target, cells, spaces, numToMove) {
    // the first and last cards of each set of #cells+1 cards put into a different space
    var firsts = new Array(spaces.length);
    var lasts = new Array(spaces.length);
    // move #cells+1 cards to successive space for as long as necessary
    var numLeft = numToMove;
    var s = 0; // num sets moved
    var current = last;
    while(numLeft > cells.length+1) {
      lasts[s] = current;
      for(var t = 0; t < cells.length; t++) current = current.previousSibling;
      firsts[s] = current;
      this.queueSimpleMove(current, lasts[s], spaces[s], cells);
      current = current.previousSibling
      numLeft -= cells.length+1;
      s++;
    }
    // move the last few cards (<c+1 of them, so a simple move is sufficient)
    this.queueSimpleMove(first, current, target, cells);
    // move each of the piles of cards previously put into spaces to the real destination
    for(s = s-1; s >= 0; s--)
      this.queueSimpleMove(firsts[s], lasts[s], target, cells);
  },

  queueComplexMove: function(first, last, target, cells, spaces, numToMove) {
    var numLeft = numToMove;
    var firsts = new Array(spaces.length);
    var lasts = new Array(spaces.length);
    var nums = new Array(spaces.length);  // nums[i] = #[firsts[i]..lasts[i]]
    // fill the spaces
    var i = 0;
    var remainingSpaces = spaces;
    var usedSpaces = [];
    var current = last;
    while(numLeft > cells.length+1) {
      var space = remainingSpaces.shift();
      usedSpaces.push(space);
      var num = nums[i] = remainingSpaces.length*(cells.length+1)+1; // the num of cards to move to the next space
      lasts[i] = current;
      for(var j = 1; j < num; j++) current = current.previousSibling;
      firsts[i] = current;
      this.queueMediumMove(firsts[i], lasts[i], space, cells, remainingSpaces, num);
      current = current.previousSibling;
      numLeft -= num;
      i++;
    }
    // move the <c+1 remaining cards
    this.queueSimpleMove(first, current, target, cells);
    // empty spaces
    for(i = i-1; i >= 0; i--) {
      this.queueMediumMove(firsts[i], lasts[i], target, cells, remainingSpaces, nums[i]);
      remainingSpaces.unshift(usedSpaces.pop());
    }
  }
}

