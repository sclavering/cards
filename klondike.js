Games.klondike = true;

AllGames.klondike = {
  __proto__: BaseCardGame,

  id: "klondike",
  dealFromStock: "to waste, can turn stock over",
  canMoveToPile: "descending, alt colours, kings in spaces",
  getLowestMovableCard: "face up",

  init: function() {
    var cards = this.cards = getDecks(1);

    // add pointers to next card up in same suit
    for(var i = 0; i != 51; i++) cards[i].up = cards[i+1];
    cards[12].up = cards[25].up = cards[38].up = cards[51].up = null;

    // black sixes may be autoplayed after both red fives are on foundations, etc.
    // Aces and twos may always be autoplayed
    var off = [12, -14, -27, -27, 25, 25, 12, -14];
    for(i = 0; i != 4; i++) {
      for(var j = 2, k = 2 + i*13; j != 13; j++, k++) {
        var card = cards[k];
        card.autoplayAfterA = cards[k+off[i]];
        card.autoplayAfterB = cards[k+off[i+4]];
        card.mayAutoplay getter= function() {
          return this.autoplayAfterA.parentNode.isFoundation && this.autoplayAfterB.parentNode.isFoundation;
        };
      }
    }
    cards[1].mayAutoplay = cards[14].mayAutoplay = cards[27].mayAutoplay = cards[40].mayAutoplay = true;

    this.aces = [cards[0], cards[13], cards[26], cards[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 7; i++) dealToPile(cards,this.piles[i],i,1);
    dealToPile(cards,this.stock,cards.length,0);
  },

  getHints: function() {
    this.getHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.getHintsFor(this.getLowestMovableCard(this.piles[i]));
  },
  getHintsFor: function(card) {
    if(!card) return;
    if(card.isKing) {
      // suggest just one move to an empty pile, and only if the king is on something else
      if(card.previousSibling || card.parentNode.isWaste) {
        var pile = searchPiles(this.piles, testPileIsEmpty);
        if(pile) this.addHint(card, pile);
      }
      // to foundation
      pile = searchPiles(this.foundations, testCanMoveToFoundation(card));
      if(pile) this.addHint(card, pile);
    } else {
      // only looks at foundations and *nonempty* spaces
      this.addHintsFor(card);
    }
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testCanMoveToPile(card))
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
    "card-revealed"       :    5,
    "move-from-foundation":  -15,
    "stock-turned-over"   : -100
  }
};
