// "perform" would be called "do", but for that pesky language keyword


function RevealCardAction(card) {
  this.card = card;
}
RevealCardAction.prototype = {
  action: "card-revealed",

  perform: function() {
    this.card.turnFaceUp();
  },
  undo: function() {
    this.card.setFaceDown();
    Game.undo();
  }
}


function DealFromStockToPileAction(pile) {
  this.to = pile;
}
DealFromStockToPileAction.prototype = {
  action: "dealt-from-stock",

  perform: function() {
    Game.dealCardTo(this.to);
    var c = Game.stock.counter;
    if(c) c.value = parseInt(c.value) - 1;
    Game.autoplay();
  },
  undo: function() {
    Game.undealCardFrom(this.to);
    var c = Game.stock.counter;
    if(c) c.value = parseInt(c.value) + 1;
  }
}


function TurnStockOverAction() {}
TurnStockOverAction.prototype = {
  action: "stock-turned-over",

  perform: function() {
    while(Game.waste.hasChildNodes()) Game.undealCardFrom(Game.waste);
    if(Game.stock.counter) Game.stock.counter.value = Game.stock.childNodes.length;
    Game.autoplay();
  },
  undo: function() {
    while(Game.stock.hasChildNodes()) Game.dealCardTo(Game.waste);
    if(Game.stock.counter) Game.stock.counter.value = 0;
  }
}


// has to work for Wasp, where just 3 cards are dealt, but there are seven piles
function DealToPilesAction() {}
DealToPilesAction.prototype = {
  action: "dealt-from-stock",
  dealt: 0,

  perform: function() {
    var stacks = Game.stacks;
    for(var i = 0; i != stacks.length && Game.stock.hasChildNodes(); i++) Game.dealCardTo(stacks[i]);
    this.dealt = i;
    if(Game.stock.counter) Game.stock.counter.add(-1);
    Game.autoplay();
  },
  undo: function() {
    var stacks = Game.stacks;
    for(var i = this.dealt; i != 0; i--) Game.undealCardFrom(stacks[i-1]);
    if(Game.stock.counter) Game.stock.counter.add(1);
  }
}


function DealToNonEmptyPilesAction() {}
DealToNonEmptyPilesAction.prototype = {
  action: "dealt-from-stock",
  last: 0, // the pile index we reached on the final deal before running out of cards

  perform: function() {
    var piles = Game.stacks;
    for(var i = 0; i != piles.length && Game.stock.hasChildNodes(); i++) {
      if(piles[i].hasChildNodes()) {
        Game.dealCardTo(piles[i]);
        this.last = i;
      }
    }
    if(Game.stock.counter) Game.stock.counter.add(-1);
    Game.autoplay();
  },
  undo: function() {
    var piles = Game.stacks;
    for(var i = this.last; i != -1; i--)
      if(piles[i].hasChildNodes()) Game.undealCardFrom(piles[i]);
    if(Game.stock.counter) Game.stock.counter.add(1);
  }
}


// source is where the card was originally from, not the temp. stack it was
// probably dragged around in.
function MoveAction(card, source, destination) {
  this.card = card;
  this.source = source;
  this.destination = destination;
  this.action =
      (destination.isFoundation && !source.isFoundation) ? "move-to-foundation" :
      (source.isFoundation && !destination.isFoundation) ? "move-from-foundation" :
      (source==Game.waste) ? "move-from-waste" :
      "move-between-piles";
}
MoveAction.prototype = {
  perform: function() {
    this.card.moveTo(this.destination);
  },
  undo: function() {
    this.card.transferTo(this.source);
  }
}
