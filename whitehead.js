Games.whitehead = true;

AllGames.whitehead = {
  __proto__: BaseCardGame,

  id: "whitehead",
  layout: "klondike",
  dealFromStock: "to waste",
  canMoveCard: "descending, in suit",
  canMoveToPile: "descending, same colour",
  getLowestMovableCard: "descending, in suit",

  init: function() {
    var cards = this.cards = getDecks(1);

    // add pointers to next card up in same suit
    for(var i = 0; i != 51; i++) cards[i].up = cards[i+1];
    cards[12].up = cards[25].up = cards[38].up = cards[51].up = null;

    // offsets to reach to other suit of same colour
    var off = [39, 13, -13, -39];

    for(i = 0; i != 4; i++) {
      for(var j = 0, k = i*13; j != 13; j++, k++) {
        var card = cards[k];

        if(j >= 2) {
          // black sixes may be autoplayed after both *black* fives are on foundations, etc.
          // Aces and twos may always be autoplayed
          card.autoplayAfter = cards[k+off[i]-1];
          card.mayAutoplay getter= function() {
            return this.autoplayAfter.parentNode.isFoundation;
          };
        } else {
          card.mayAutoplay = true;
        }

        card.goesOn = j==12 ? [] : [cards[k+1], cards[k+off[i]+1]];
      }
    }

    this.aces = [cards[0], cards[13], cards[26], cards[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 7; i++) dealToPile(cards, this.piles[i], 0, i+1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  getHints: function() {
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var ons = card.goesOn;
    for(var i = 0; i != ons.length; i++) {
      var on = ons[i], onp = on.parentNode;
      if(onp.isNormalPile && !on.nextSibling) return onp;
    }
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testPileIsEmpty)
        || (!card.nextSibling && searchPiles(this.foundations, testCanMoveToFoundation(card)));
  },

  autoplayMove: function() {
    var lookedForAces = false;
    for(var i = 0; i != 4; i++) {
      var f = this.foundations[i];
      if(f.hasChildNodes()) {
        var c = f.lastChild.up;
        if(c && c.faceUp && !c.nextSibling && c.mayAutoplay) return this.moveTo(c, f);
      } else if(!lookedForAces) {
        lookedForAces = true;
        for(var j = 0; j != 4; j++) {
          var a = this.aces[j];
          if(a.faceUp && !a.parentNode.isFoundation && !a.nextSibling) return this.moveTo(a, f);
        }
      }
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :   10,
    "move-from-waste"     :    5,
    "move-from-foundation":  -15,
    "stock-turned-over"   : -100
  }
};
