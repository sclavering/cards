/*
perform() would be do() but for that pesky language keyword

perform() can be either synchronous or asynchronous (i.e use animation or not), but the action obj.
should have a "synchronous" member to say which.

undo() should always be synchronous.

redo() should be synchronous if present.  if not present perform() is used instead, and should be synchronous

the "action" member is used for scoring.
*/

function Reveal(card) {
  this.card = card;
}
Reveal.prototype = {
  action: "card-revealed",
  synchronous: false,
  undoNext: true,

  perform: function() {
    turnCardUp(this.card);
    // evil-ish hack to get this move redone when the preceding one is redone
    var d = Game.actionsDone;
    d[d.length-2].redoNext = true;
  },
  undo: function() {
    this.card.setFaceDown();
  },
  redo: function() {
    this.card.setFaceUp();
  }
}


function DealToPile(pile) {
  this.to = pile;
}
DealToPile.prototype = {
  action: "dealt-from-stock",
  synchronous: true,

  perform: function() {
    Game.dealCardTo(this.to);
    Game.stock.counter--;
  },
  undo: function() {
    Game.undealCardFrom(this.to);
    Game.stock.counter++;
  }
}


function TurnStockOverAction() {}
TurnStockOverAction.prototype = {
  action: "stock-turned-over",
  synchronous: true,

  perform: function() {
    while(Game.waste.hasChildNodes()) Game.undealCardFrom(Game.waste);
    Game.stock.counter = Game.stock.childNodes.length;
  },
  undo: function() {
    while(Game.stock.hasChildNodes()) Game.dealCardTo(Game.waste);
    Game.stock.counter = 0;
  }
}


// has to work for Wasp, where just 3 cards are dealt, but there are seven piles
function DealToPiles() {}
DealToPiles.prototype = {
  action: "dealt-from-stock",
  synchronous: true,
  dealt: 0,

  perform: function() {
    var piles = Game.piles;
    for(var i = 0; i != piles.length && Game.stock.hasChildNodes(); i++) Game.dealCardTo(piles[i]);
    this.dealt = i;
    Game.stock.counter--;
  },
  undo: function() {
    var piles = Game.piles;
    for(var i = this.dealt; i != 0; i--) Game.undealCardFrom(piles[i-1]);
    Game.stock.counter++;
  }
}


function DealToNonEmptyPilesAction() {}
DealToNonEmptyPilesAction.prototype = {
  action: "dealt-from-stock",
  synchronous: true,
  last: 0, // the pile index we reached on the final deal before running out of cards
  num: 0, // num piles dealt to

  perform: function() {
    var piles = Game.piles, num = 0;
    for(var i = 0; i != piles.length && Game.stock.hasChildNodes(); i++) {
      if(piles[i].hasChildNodes()) {
        Game.dealCardTo(piles[i]);
        this.last = i;
        num++;
      }
    }
    this.num = num;
    Game.stock.counter -= num;
  },
  undo: function() {
    var piles = Game.piles;
    for(var i = this.last; i != -1; i--)
      if(piles[i].hasChildNodes()) Game.undealCardFrom(piles[i]);
    Game.stock.counter += this.num;
  }
}


// source (optional) is where the card was originally from,
// not the temp. pile it was probably dragged around in
function Move(card, destination, source) {
  this.card = card;
  this.source = source = source || card.parentNode.source;
  this.destination = destination;
  this.action =
      destination.isFoundation
      ? (source.isFoundation ? "foundation->foundation" : "->foundation")
      : (source.isFoundation ? "foundation->" : (source.localName+"->"+destination.localName));
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
