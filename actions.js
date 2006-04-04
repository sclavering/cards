/*
perform() would be do() but for that pesky language keyword

perform() can be either synchronous or asynchronous (i.e use animation or not), but the action obj.
should have a "synchronous" member to say which.

undo() should always be synchronous.

redo() should be synchronous if present.  if not present perform() is used instead, and should be synchronous

the "action" member is used for scoring.

Game.getActionForDrop might return an ErrorMsg instead of a real Action
*/

function DealToPile(pile) {
  this.to = pile;
}
DealToPile.prototype = {
  synchronous: true,

  perform: function() {
    const s = Game.stock;
    s.dealCardTo(this.to);
    s.counter--;
  },
  undo: function() {
    const s = Game.stock;
    s.undealCardFrom(this.to);
    s.counter++;
  }
}


function RefillStock() {}
RefillStock.prototype = {
  synchronous: true,

  perform: function() {
    const s = Game.stock, w = Game.waste;
    this.wasteOldNextOffsetMultiplier = w.nextOffsetMultiplier || 0; // draw3 hack
    while(w.hasCards) s.undealCardFrom(w);
    w.nextOffsetMultiplier = 0; // draw3 hack    
    s.counter = s.childNodes.length;
  },
  undo: function() {
    const s = Game.stock, w = Game.waste;
    w.nextOffsetMultiplier = this.wasteOldNextOffsetMultiplier - s.childNodes.length; // draw3 hack
    while(s.hasCards) s.dealCardTo(w);
    s.counter = 0;
  }
}


function Deal3Action() {}
Deal3Action.prototype = {
  synchronous: true,

  perform: function() {
    const s = Game.stock, w = Game.waste;
    this.numPacked = w.packCards();
    const num = this.numMoved = Math.min(s.childNodes.length, 3);
    for(var i = 0; i != num; ++i) s.dealCardTo(w);
    s.counter -= num;
  },

  undo: function() {
    const s = Game.stock, w = Game.waste;
    s.counter += this.numMoved;
    for(var i = this.numMoved; i != 0; --i) s.undealCardFrom(w);
    w.unpackCards(this.numPacked);
  }
}


// has to work for Wasp, where just 3 cards are dealt, but there are seven piles
function DealToPiles() {}
DealToPiles.prototype = {
  synchronous: true,
  dealt: 0,

  perform: function() {
    const s = Game.stock, ps = Game.piles, len = ps.length;
    for(var i = 0; i != len && s.hasCards; ++i) s.dealCardTo(ps[i]);
    this.dealt = i;
    s.counter--;
  },
  undo: function() {
    const s = Game.stock, ps = Game.piles;
    for(var i = this.dealt; i != 0; i--) s.undealCardFrom(ps[i-1]);
    s.counter++;
  }
}


function DealToNonEmptyPilesAction() {}
DealToNonEmptyPilesAction.prototype = {
  synchronous: true,
  last: 0, // the pile index we reached on the final deal before running out of cards
  num: 0, // num piles dealt to

  perform: function() {
    const s = Game.stock, ps = Game.piles, len = ps.length;
    var num = 0;
    for(var i = 0; i != len && s.hasCards; ++i) {
      if(!ps[i].hasCards) continue;
      s.dealCardTo(ps[i]);
      this.last = i;
      num++;
    }
    this.num = num;
    s.counter -= num;
  },
  undo: function() {
    const s = Game.stock, ps = Game.piles;
    for(var i = this.last; i != -1; i--)
      if(ps[i].hasCards) s.undealCardFrom(ps[i]);
    s.counter += this.num;
  }
}


function Move(card, destination) {
  this.card = card;
  this.source = card.pile.source; // where the card came from, not the temp pile used for moving
  this.destination = destination;
}
Move.prototype = {
  synchronous: false,

  perform: function() {
    moveCards(this.card, this.destination);
  },
  undo: function() {
    this.source.addCards(this.card);
  },
  redo: function() {
    this.destination.addCards(this.card);
  }
}


function RemovePair(card1, card2) {
  this.c1 = card1; this.p1 = card1.pile.source;
  this.c2 = card2; this.p2 = card2 && card2.pile.source;
}
RemovePair.prototype = {
  synchronous: true,

  perform: function() {
    Game.foundation.addCards(this.c1);
    if(this.c2) Game.foundation.addCards(this.c2);
  },
  undo: function(undo) {
    if(this.c2) this.p2.addCards(this.c2);
    this.p1.addCards(this.c1);
  }
}



function ErrorMsg(msg) {
  this.msg = msg;
}
ErrorMsg.prototype = {
  show: function() {
    showMessage(this.msg);
  }
}
