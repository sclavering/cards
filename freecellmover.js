/** FreeCellMover
  *
  * handles the complex series of moves required to move a run of cards in games
  * like FreeCell, where only one card can be moved at once.
  *
  * move(card, destination, freeCells, spaces)
  *   will work out which of the move algorithms to apply and use it
  *   if the move is not possible it will alert() the user to this
  *
  * step()
  *   called at the end of CardMover.step() (or whatever the function is called :)
  *   calculates which move algorithms are currently in use (each one is called by
  *   the next level up of complexity), and preforms a single step for that.
  *   You should probably not call this function from outside CardMover
  *
  *
  */
FreeCellMover = {
  // for Simple/Medium/ComplexMover, state=0 means that this mover is currently inactive
  SimpleMover: {
    state: 0, // 1 = moving cards to cells, 2 = moving card, 3 = bringing cards back from cells

    freeCells: [],
    card: null,
    source: null,
    target: null,
    numToMove: 0,
    cellNum: 0, // counted up to numToMove when moving to cells, then counted back down again

    start: function(card, target, freeCells, numToMove) {
      // state==1||3 parts of step must be able to run at least once.
      if(numToMove==1) {
        card.moveTo(target);
      } else {
        this.card = card;
        this.source = card.parentNode;
        this.target = target;
        this.freeCells = freeCells;
        this.numToMove = numToMove;
        this.cellNum = 0;
        this.state = 1;
        this.step();
      }
    },
    step: function() {
      if(this.state==1) {
        // move to cell
        this.source.lastChild.moveTo(this.freeCells[this.cellNum]);
        this.cellNum++;
        if(this.cellNum==this.numToMove-1) this.state = 2;
      } else if(this.state==2) {
        // move |card| itslef
        this.card.moveTo(this.target);
        this.state = 3;
      } else if(this.state==3) {
        // take card back from cell
        this.cellNum--;
        this.freeCells[this.cellNum].lastChild.moveTo(this.target);
        if(this.cellNum==0) this.state = 0;
      }
    }
  },

  MediumMover: {
    state: 0, // 1 = moving groups to spaces, 2 = moving card to dest, 3 = moving groups back from spaces
    freeCells: [],
    card: null,
    source: null,
    siblings: null, // of card
    target: null,
    numToMove: 0,
    spaces: null,
    spaceNum: 0,
    groupSize: 0,
    start: function(card, target, freeCells, spaces, numToMove) {
      this.groupSize = freeCells.length+1;
      // if ComplexMover calls this to move <=groupSize cards it would cause errors, because the
      // state==1||3 sections of step() are desinged to run at least once
      if(numToMove <= this.groupSize) {
        FreeCellMover.SimpleMover.start(card,target,freeCells,numToMove);
      } else {
        this.card = card;
        this.source = card.parentNode;
        this.target = target;
        this.freeCells = freeCells;
        this.spaces = spaces;
        this.numToMove = numToMove;
        this.spaceNum = 0;
        this.state = 1;
        this.step();
      }
    },
    step: function() {
      if(this.state==1) {
        // move a group to a space
        var children = this.source.childNodes;
        var grouptop = children[children.length - this.groupSize];
        FreeCellMover.SimpleMover.start(grouptop,this.spaces[this.spaceNum],this.freeCells,this.groupSize);
        this.spaceNum++;
        this.numToMove -= this.groupSize;
        if(this.numToMove <= this.groupSize) this.state = 2;
      } else if(this.state==2) {
        // move last few cards (must be less than groupSize of them)
        FreeCellMover.SimpleMover.start(this.card,this.target,this.freeCells,this.numToMove);
        this.state = 3;
      } else if(this.state==3) {
        // get next space filled and move a group to destination
        this.spaceNum--;
        FreeCellMover.SimpleMover.start(this.spaces[this.spaceNum].firstChild,
          this.target,this.freeCells,this.groupSize);
        if(this.spaceNum==0) this.state = 0;
      }
    }
  },

  ComplexMover: {
    state: 0, // 1 = moving sets to spaces, 2 = moving card to dest, 3 = moving sets back from spaces
    freeCells: [],
    card: null,
    source: null,
    siblings: null, // of card
    target: null,
    numToMove: 0,
    spaces: null,
    filled: null,
    groupSize: 0,
    start: function(card, target, freeCells, spaces, numToMove) {
      this.card = card;
      this.source = card.parentNode;
      //this.siblings = card.parentNode.childNodes; // childNodes better be live!
      this.target = target;
      this.freeCells = freeCells;
      this.groupSize = freeCells.length+1;
      // want to reverse spaces, so that MedMovr builds piles nicely
      this.spaces = spaces.reverse();
      this.filled = [];
      this.numToMove = numToMove;
      this.spaceNum = 0;
      this.state = 1;
      this.step();
    },
    step: function() {
      if(this.state==1) {
        // move a set of groups out to fill all spaces then consolidate into first space
        var numcards = this.groupSize*this.spaces.length;
        var children = this.source.childNodes;
        var settop = children[children.length-numcards];
        // we remove a stack from spaces because after MediumMove call it will have been filled
        var stack = this.spaces.pop();
        FreeCellMover.MediumMover.start(settop,stack,this.freeCells,this.spaces,numcards);
        this.filled.push(stack);
        this.numToMove -= numcards;
        if(this.numToMove <= this.groupSize*this.spaces.length) this.state = 2;
      } else if(this.state==2) {
        FreeCellMover.MediumMover.start(this.card,this.target,this.freeCells,this.spaces,this.numToMove);
        this.state = 3;
      } else if(this.state==3) {
        // move smallest set to target
        var stack = this.filled.pop();
        FreeCellMover.MediumMover.start(stack.firstChild,this.target,this.freeCells,
          this.spaces,stack.childNodes.length);
        this.spaces.push(stack);
        if(this.filled.length==0) this.state = 0;
      }
    }
  },

  move: function(card, target, freeCells, spaces) {
    // remove the target from the list of free cells
    // this is a workaround for the case where the card end up being moved onto the target,
    // but above other cards that should be below it.  this is not the ideal solution though
    // because complex moves should be able to use the target as a space if it is one (I think)
    for(var i = 0; i < spaces.length; i++)
      if(spaces[i]==target) spaces.splice(i,1);
    // groupsize is the number of cards which can be moved without filling spaces
    var groupsize = freeCells.length+1;
    var numSpaces = spaces.length;
    var sumToNumSpaces = parseInt(numSpaces * (numSpaces + 1) / 2);
    // work out how many cards are to move
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;
    // decide which move strategy to employ dependent on number of cards, free cells, and spaces
    if(numToMove <= groupsize) {
      // just move each card to a cell then pull them off again
      this.SimpleMover.start(card,target,freeCells,numToMove);
    } else if(numToMove <= numSpaces+groupsize) {
      // when numToMove <= numSpaces+numFreeCells+1 it looks more natural to use the spaces just
      // like cells, and apply the SimpleMove strategy
      this.SimpleMover.start(card,target,freeCells.concat(spaces),numToMove);
    } else if(numToMove <= groupsize*(numSpaces+1)) {
      // move groups of (numFreeCells+1) through cells to each space, then pull back
      // complexMove would most likely work, but would look odd as unnecessary work would be done
      this.MediumMover.start(card,target,freeCells,spaces,numToMove);
    } else if(numToMove <= groupsize*sumToNumSpaces) { // could be made grpsz*(sumTo.. +1)
      // run the last type of move, then consolidate all into one pile,
      // then run this kind again, until all but |card| have been moved
      this.ComplexMover.start(card,target,freeCells,spaces,numToMove);
    }
  },
  // returns true to CardMover so that UI en/disabling is done well (no momentary enabling of UI)
  step: function() {
    if(this.SimpleMover.state) {
      this.SimpleMover.step();
      return true;
    } else if(this.MediumMover.state) {
      this.MediumMover.step();
      return true;
    } else if(this.ComplexMover.state) {
      this.ComplexMover.step();
      return true;
    }
    return false;
  }
}
