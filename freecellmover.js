/** FreeCellMover
  *
  * handles the complex series of moves required to move a run of cards in games
  * like FreeCell, where only one card can be moved at once.
  *
  * move(card, destination, freeCells, spaces)
  *   will work out the sequence of single-card moves required, and stores them in
  *   |moveQueue|.  the first of these moves is then performed
  *
  * step()
  *   called at the end of CardMover.step() (or whatever the function is called)
  *   performs the next single-card move in |moveQueue|
  */
var FreeCellMover = {
  moveQueue: null, // an array (queue) of single card moves to be performed
                   // this will be null rather than an empty array
  
  step: function() {
    if(!this.moveQueue) return false;
    
    var move = this.moveQueue.shift();
    move.card.moveTo(move.target);
    
    if(this.moveQueue.length==0) this.moveQueue = null;
    return true;
  },
  
  move: function(card, target, freeCells, spaces) {
//    alert("FreeCellMove.move(\n"+card+"\n"+target+"\n"+freeCells+"\n"+spaces+"\n);");
    // remove the target from the list of free cells
    // this is a workaround for the case where the card end up being moved onto the target,
    // but above other cards that should be below it.  this is not the ideal solution though
    // because complex moves should be able to use the target as a space if it is one (I think)
    for(var i = 0; i < spaces.length; i++)
      if(spaces[i]==target) spaces.splice(i,1);
    // groupsize is the number of cards which can be moved without filling spaces
    var groupsize = freeCells.length+1;
    var numSpaces = spaces.length;
    var sumToNumSpaces = numSpaces * (numSpaces + 1) / 2;
    // work out how many cards are to move
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;
    // decide which move strategy to employ dependent on number of cards, free cells, and spaces
    this.moveQueue = [];
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
    } else if(numToMove <= groupsize*(sumToNumSpaces+1)) { 
      // run the last type of move, then consolidate all into one pile,
      // then run this kind again, until all but |card| have been moved
      this.queueComplexMove(card, last, target, freeCells, spaces, numToMove);
    }
    
    this.step();
  },
  
  // append to |moves| the seq of moves that uses only the |cells| as intermediate storage
  // (which might includes some spaces as well as cells), and moves the cards between
  // |first| and |last| inclusive to |target|
  queueSimpleMove: function(first, last, target, cells) {
    var current, i = 0;
    // move cards on top of |first| (up to |last|) to cells
    for(current = last; current!=first; current = current.previousSibling)
      this.moveQueue.push({card: current, target: cells[i++]});
    // move |first| to |target|
    this.moveQueue.push({card: first, target: target});
    // move cards back from cells
    for(current = first.nextSibling; current!=last.nextSibling; current = current.nextSibling)
      this.moveQueue.push({card: current, target: target});
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
    // move final few cards (<c+1 of them
    this.queueSimpleMove(first, current, target, cells);
    // empty spaces
    for(i = i-1; i >= 0; i--) {
      this.queueMediumMove(firsts[i], lasts[i], target, cells, remainingSpaces, nums[i]);
      remainingSpaces.unshift(usedSpaces.pop());
    }
  }
}



