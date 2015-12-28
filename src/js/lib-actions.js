/*
"Action" objects are card-moves that can be done, undone, and redone.

Turning cards face up is handled implicitly in gCurrentGame.doo, rather than being a stand-alone Action.

The required interface is:

perform()
  Carry out the action.
  If animation is desired, this should return appropriate details to pass to g_animations.run().  It should not start the animation itself.  And it almost certainly needs to implement .redo() as well.
undo()
redo()
  Undo/redo the effects of the action.  Must *not* use animation.
  If redo() is omitted, perform() is used instead, and must not use animation.
pileWhichMayNeedCardsRevealing
  An optional field holding a Pile.  Used to automatically turn up face-down
  cards at the top of the Pile, in gCurrentGame.doo()

Pile.getActionForDrop() normally returns an Action, but in FreeCell and similar
it may return an ErrorMsg instead.
*/

function DealToPile(pile) {
  this.to = pile;
}
DealToPile.prototype = {

  perform: function() {
    const s = gCurrentGame.stock;
    s.dealCardTo(this.to);
  },
  undo: function() {
    const s = gCurrentGame.stock;
    s.undealCardFrom(this.to);
  }
}


function RefillStock() {}
RefillStock.prototype = {

  perform: function() {
    const s = gCurrentGame.stock, w = gCurrentGame.waste;
    while(w.hasCards) s.undealCardFrom(w);
  },
  undo: function() {
    const s = gCurrentGame.stock, w = gCurrentGame.waste;
    while(s.hasCards) s.dealCardTo(w);
  }
}


function Deal3Action() {}
Deal3Action.prototype = {

  perform: function() {
    const s = gCurrentGame.stock, w = gCurrentGame.waste;
    this.old_deal3v = w.deal3v;
    this.old_deal3t = w.deal3t;
    const cs = s.cards, num = Math.min(cs.length, 3), ix = cs.length - num;
    this.numMoved = w.deal3v = num;
    w.deal3t = w.cards.length + num;
    for(var i = 0; i !== num; ++i) s.dealCardTo(w);
  },

  undo: function() {
    const s = gCurrentGame.stock, w = gCurrentGame.waste, num = this.numMoved;
    w.deal3v = this.old_deal3v;
    w.deal3t = this.old_deal3t;
    for(var i = 0; i !== num; ++i) s.undealCardFrom(w);
  }
}


// has to work for Wasp, where just 3 cards are dealt, but there are seven piles
function DealToPiles() {}
DealToPiles.prototype = {
  dealt: 0,

  perform: function() {
    const s = gCurrentGame.stock, ps = gCurrentGame.piles, len = ps.length;
    for(var i = 0; i !== len && s.hasCards; ++i) s.dealCardTo(ps[i]);
    this.dealt = i;
  },
  undo: function() {
    const s = gCurrentGame.stock, ps = gCurrentGame.piles;
    for(var i = this.dealt; i !== 0; i--) s.undealCardFrom(ps[i - 1]);
  }
}


function DealToNonEmptyPilesAction() {}
DealToNonEmptyPilesAction.prototype = {
  last: 0, // the pile index we reached on the final deal before running out of cards
  num: 0, // num piles dealt to

  perform: function() {
    const s = gCurrentGame.stock, ps = gCurrentGame.piles, len = ps.length;
    var num = 0;
    for(var i = 0; i !== len && s.hasCards; ++i) {
      if(!ps[i].hasCards) continue;
      s.dealCardTo(ps[i]);
      this.last = i;
      num++;
    }
    this.num = num;
  },
  undo: function() {
    const s = gCurrentGame.stock, ps = gCurrentGame.piles;
    for(var i = this.last; i !== -1; i--)
      if(ps[i].hasCards) s.undealCardFrom(ps[i]);
  }
}


function Move(card, destination) {
  this.card = card;
  this.source = card.pile;
  this.destination = destination;
}
Move.prototype = {
  get pileWhichMayNeedCardsRevealing() { return this.source; },

  perform: function() {
    const rv = prepare_move_animation(this.card, this.destination);
    this.destination.addCards(this.card, true); // doesn't update view
    return rv;
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

  perform: function() {
    gCurrentGame.foundation.addCards(this.c1);
    if(this.c2) gCurrentGame.foundation.addCards(this.c2);
  },
  undo: function(undo) {
    if(this.c2) this.p2.addCards(this.c2);
    this.p1.addCards(this.c1);
  }
}



function ErrorMsg(msgText1, msgText2) {
  this._msgText1 = msgText1;
  this._msgText2 = msgText2;
}
ErrorMsg.prototype = {
  show: function() {
    showMessage(this._msgText1, this._msgText2);
  }
}
