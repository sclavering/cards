
// base class for FreeCell and Seahaven Towers
var FreeCellGame = {
  __proto__: BaseCardGame,

  mouseHandling: "click-to-select",

  get insufficientSpacesMessage() {
    // this is called on instances of games, which are two levels up
    var ths = this.__proto__.__proto__;
    delete ths.insufficientSpacesMessage;
    return ths.insufficientSpacesMessage = document.documentElement.getAttribute("insufficientSpacesMessage");
  },

  // unlike in other games where this function returns a boolean, here we sometimes return an int.
  // false==move impossible (violates rules), 0==not enough spaces for move, true==move possible
  // (using 0 means the overall behaviour will match other games, but callers which do want to
  // know about an insufficent spaces result can test if the result ===0)
  canMoveTo: function(card, target) {
    if(target.isCell) return this.canMoveToCell(card, target);
    if(target.isFoundation) return this.canMoveToFoundation(card, target);
    if(this.canMoveToPile(card, target))
      return (this.movePossible(card,target) ? true : 0);
    return false;
  },

  // this should work for most games which have cells
  canMoveToCell: function(card, target) {
    return (!target.hasChildNodes() && !card.nextSibling);
  },

  moveTo: function(card, target) {
    var source = card.parentNode;
    if(target.isNormalPile && card.nextSibling) {
      this.doAction(new FreeCellMoveAction(card, source, target, this.emptyCells, this.getEmptyPiles(target)));
    } else {
      var action = new MoveAction(card,source,target);
      action.action = target.isCell ? "card-moved-to-cell" : "cards-moved-to-foundation";
      this.doAction(action);
    }
    return true;
  },

  // must override global version to deal with oddities of canMoveTo in Freecell-like games
  // (it returns 0, not false, if the move is legal but there aren't enough spaces for it)
  attemptMove: function(source, target) {
    var can = Game.canMoveTo(source, target);
    if(can) return Game.moveTo(source,target);
    if(can===0) showInsufficientSpacesMsg();
    return false;
  },

  get emptyCells() {
    var freecells = [];
    for(var i = 0; i != this.cells.length; i++)
      if(!this.cells[i].hasChildNodes()) freecells.push(this.cells[i]);
    return freecells;
  },

  get numEmptyCells() {
    var cells = 0;
    for(var i = 0; i != this.cells.length; i++) if(!this.cells[i].hasChildNodes()) cells++;
    return cells;
  },

  get emptyCell() {
    for(var i = 0; i != this.cells.length; i++) if(!this.cells[i].hasChildNodes()) return this.cells[i];
    return null;
  },

  // the target of a move can't also be used as a space (I think)
  getEmptyPiles: function(pileToIgnore) {
    var spaces = [];
    for(var i = 0; i != this.piles.length; i++) {
      var p = this.piles[i];
      if(p!=pileToIgnore && !p.hasChildNodes()) spaces.push(p);
    }
    return spaces;
  },

  countEmptyPiles: function(pileToIgnore) {
    var num = 0
    for(var i = 0; i != this.piles.length; i++) {
      var p = this.piles[i];
      if(p!=pileToIgnore && !p.hasChildNodes()) num++
    }
    return num;
  },

  get emptyPile() {
    for(var i = 0; i != this.piles.length; i++) if(!this.piles[i].hasChildNodes()) return this.piles[i];
    return null;
  },

  // overriden because we want to call FreeCellMover.step(), and don't need to reveal cards
  autoplay: function() {
    if(FreeCellMover.step() || this.autoplayMove())
      return true;
    if(Game.hasBeenWon()) {
      showGameWon();
      return true;
    }
    return false;
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
  action: "move-between-piles",
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
    this.cards.shift().moveTo(this.tos.shift());
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
      // when numToMove <= numSpaces+numFreeCells+1 it looks more natural to use the spaces just
      // like cells, and apply the SimpleMove strategy
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

