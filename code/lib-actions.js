/*
perform() would be do() but for that pesky language keyword

perform() can be either synchronous or asynchronous (i.e use animation or not), but the action obj.
should have a "synchronous" member to say which.

undo() should always be synchronous.

redo() should be synchronous if present.  if not present perform() is used instead, and should be synchronous

the "action" member is used for scoring.

somePile.getActionForDrop might return an ErrorMsg instead of a real Action
*/

function DealToPile(pile) {
  this.to = pile;
}
DealToPile.prototype = {
  synchronous: true,

  perform: function() {
    const s = Game.stock;
    s.dealCardTo(this.to);
  },
  undo: function() {
    const s = Game.stock;
    s.undealCardFrom(this.to);
  }
}


function RefillStock() {}
RefillStock.prototype = {
  synchronous: true,

  perform: function() {
    const s = Game.stock, w = Game.waste;
    while(w.hasCards) s.undealCardFrom(w);
  },
  undo: function() {
    const s = Game.stock, w = Game.waste;
    while(s.hasCards) s.dealCardTo(w);
  }
}


function Deal3Action() {}
Deal3Action.prototype = {
  synchronous: true,

  perform: function() {
    const s = Game.stock, w = Game.waste;
    this.old_deal3v = w.deal3v;
    this.old_deal3t = w.deal3t;
    const cs = s.cards, num = Math.min(cs.length, 3), ix = cs.length - num;
    this.numMoved = w.deal3v = num;
    w.deal3t = w.cards.length + num;
    for(var i = 0; i != num; ++i) s.dealCardTo(w);
  },

  undo: function() {
    const s = Game.stock, w = Game.waste, num = this.numMoved;
    w.deal3v = this.old_deal3v;
    w.deal3t = this.old_deal3t;
    for(var i = 0; i != num; ++i) s.undealCardFrom(w);
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
  },
  undo: function() {
    const s = Game.stock, ps = Game.piles;
    for(var i = this.dealt; i != 0; i--) s.undealCardFrom(ps[i-1]);
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
  },
  undo: function() {
    const s = Game.stock, ps = Game.piles;
    for(var i = this.last; i != -1; i--)
      if(ps[i].hasCards) s.undealCardFrom(ps[i]);
  }
}


function Move(card, destination) {
//  dump("created a Move: "+card+" to "+destination.localName+"("+destination.lastCard+")\n");
  this.card = card;
  this.source = card.pile;
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
  this.c1 = card1; this.p1 = card1.pile;
  this.c2 = card2; this.p2 = card2 && card2.pile;
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
