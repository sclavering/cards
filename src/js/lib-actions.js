/*
"Action" objects are card-moves that can be done, undone, and redone.

The required interface is:

perform()
  Carry out the action.
  If animation is desired, this should return appropriate details to pass to g_animations.run().  It should not start the animation itself.  And it almost certainly needs to implement .redo() as well.
undo()
redo()
  Undo/redo the effects of the action.  Must *not* use animation.
  If redo() is omitted, perform() is used instead, and must not use animation.

Piles' .action_for_drop() normally returns an Action, but in FreeCell and similar it may return an ErrorMsg instead.
*/

function DealToPile(pile) {
  this.to = pile;
};
DealToPile.prototype = {
  perform: function() {
    const s = gCurrentGame.stock;
    s.deal_card_to(this.to);
  },
  undo: function() {
    const s = gCurrentGame.stock;
    s.undeal_card_from(this.to);
  },
};


function RefillStock() {};
RefillStock.prototype = {
  perform: function() {
    const s = gCurrentGame.stock, w = gCurrentGame.waste;
    while(w.hasCards) s.undeal_card_from(w);
  },
  undo: function() {
    const s = gCurrentGame.stock, w = gCurrentGame.waste;
    while(s.hasCards) s.deal_card_to(w);
  },
};


function Deal3Action() {};
Deal3Action.prototype = {
  perform: function() {
    const s = gCurrentGame.stock, w = gCurrentGame.waste;
    this.old_deal3v = w.deal3v;
    this.old_deal3t = w.deal3t;
    const cs = s.cards, num = Math.min(cs.length, 3), ix = cs.length - num;
    this.numMoved = w.deal3v = num;
    w.deal3t = w.cards.length + num;
    for(var i = 0; i !== num; ++i) s.deal_card_to(w);
  },
  undo: function() {
    const s = gCurrentGame.stock, w = gCurrentGame.waste, num = this.numMoved;
    w.deal3v = this.old_deal3v;
    w.deal3t = this.old_deal3t;
    for(var i = 0; i !== num; ++i) s.undeal_card_from(w);
  },
};


function DealToAsManyOfSpecifiedPilesAsPossible(stock, piles) {
  this._stock = stock;
  this._piles = piles.length > stock.cards.length ? piles.slice(0, stock.cards.length) : piles;
};
DealToAsManyOfSpecifiedPilesAsPossible.prototype = {
  perform: function() {
    for(let p of this._piles) this._stock.deal_card_to(p);
  },
  undo: function() {
    for(let p of this._piles.slice().reverse()) this._stock.undeal_card_from(p);
  },
};


function Move(card, destination) {
  this.card = card;
  this.source = card.pile;
  this.destination = destination;
  const new_source_top_card = this.source.cards[card.index - 1] || null;
  this.revealed_card = new_source_top_card && !new_source_top_card.faceUp ? new_source_top_card : null;
}
Move.prototype = {
  perform: function() {
    const rv = prepare_move_animation(this.card, this.destination);
    this.destination.add_cards(this.card, true); // doesn't update view
    if(this.revealed_card) this.revealed_card.setFaceUp(true);
    return rv;
  },
  undo: function() {
    if(this.revealed_card) this.revealed_card.setFaceUp(false);
    this.source.add_cards(this.card);
  },
  redo: function() {
    this.destination.add_cards(this.card);
    if(this.revealed_card) this.revealed_card.setFaceUp(true);
  },
};


function RemovePair(card1, card2) {
  this.c1 = card1; this.p1 = card1.pile;
  this.c2 = card2; this.p2 = card2 && card2.pile;
};
RemovePair.prototype = {
  perform: function() {
    gCurrentGame.foundation.add_cards(this.c1);
    if(this.c2) gCurrentGame.foundation.add_cards(this.c2);
  },
  undo: function(undo) {
    if(this.c2) this.p2.add_cards(this.c2);
    this.p1.add_cards(this.c1);
  },
};


function ErrorMsg(msgText1, msgText2) {
  this._msgText1 = msgText1;
  this._msgText2 = msgText2;
};
ErrorMsg.prototype = {
  show: function() {
    showMessage(this._msgText1, this._msgText2);
  },
};
