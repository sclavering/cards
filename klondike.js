// provides: klondike, klondike-draw3

var KlondikeBase = {
  __proto__: BaseCardGame,

  layout: "klondike",

  init: function() {
    var cs = this.cards = makeDecks(1);

    // black sixes may be autoplayed after both red fives are on foundations, etc.
    // Aces and twos may always be autoplayed
    const off = [13, -13, -26, -26, 26, 26, 13, -13];
    for(var i = 0; i != 4; i++) {
      for(var j = 2, k = 2 + i*13; j != 13; j++, k++) {
        var c = cs[k];
        c.autoplayAfterA = cs[k+off[i]-1];
        c.autoplayAfterB = cs[k+off[i+4]-1];
        //c.onA = cards[k+off[i]+1];
        //c.onB = cards[k+off[i+4]+1];
        c.__defineGetter__("mayAutoplay", mayAutoplayAfterTwoOthers);
      }
    }

    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 7; i++) this.piles[i].dealTo(cards, i, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  dealFromStock: "to waste",

  turnStockOver: "yes",

  mayAddCardToPile: "down and different colour, king in space",

  getHints: function() {
    this.getHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.getHintsFor(this.getLowestMovableCard(this.piles[i]));
  },
  getHintsFor: function(card) {
    if(!card) return;
    if(card.isKing) {
      // suggest just one move to an empty pile, and only if the king is on something else
      if(card.previousSibling || card.parentNode.isWaste) {
        var pile = this.firstEmptyPile;
        if(pile) this.addHint(card, pile);
      }
      this.addFoundationHintsFor(card);
    } else {
      // only looks at foundations and *nonempty* spaces
      this.addHintsFor(card);
    }
  },

  getLowestMovableCard: "face up",

  getBestMoveForCard: "legal",

  autoplay: "commonish",

  isWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "waste->pile": 5,
    "card-revealed": 5,
    "foundation->": -15,
    "stock-turned-over": -100
  }
};





Games["klondike"] = {
  __proto__: KlondikeBase,
  id: "klondike"
};





Games["klondike-draw3"] = {
  __proto__: KlondikeBase,
  id: "klondike-draw3",

  init2: function() {
    const w = this.waste;
    // make waste pile wider, and spacer narrower
    w.className = "draw3-waste";
    w.nextSibling.nextSibling.className = "draw3-waste-spacer";
    // only ever has to handle one card
    w.addCards = function(card) {
      var depth = ++Game.wasteDepth;
      this.appendChild(card);
      card.top = card._top = 0;
      card.left = card._left = depth>0 ? depth * gHFanOffset : 0;
    };
    // only called after a card is removed from the waste pile
    w.fixLayout = function() {
      --Game.wasteDepth;
    };
  },

  dealFromStock: function() {
    return new KlondikeDeal3Action();
  },

  // Each time cards are dealt to the waste pile this is set to the number of cards dealt.  It is
  // decreased whenever a card is removed from the pile, so will be 0 once all the cards from
  // a given deal are removed, and negative if further cards are removed.  It is needed to position
  // cards being readded to the waste pile (by undo(), for instance).
  wasteDepth: 0
};


function KlondikeDeal3Action() {
  this.oldWasteDepth = Game.wasteDepth;
};
KlondikeDeal3Action.prototype = {
  synchronous: true,

  perform: function() {
    const w = Game.waste;
    // pack any cards already there to the left of the pile
    var card = w.lastChild;
    while(card && card._left) {
      card.left = card._left = 0;
      card = card.previousSibling;
    }
    // deal new cards
    Game.wasteDepth = -1;
    var num = Game.stock.childNodes.length;
    if(num > 3) num = 3;
    for(var i = 0; i != num; ++i) Game.dealCardTo(Game.waste);
    this.numMoved = num;
  },

  undo: function() {
    const w = Game.waste;
    // undeal cards
    for(var i = this.numMoved; i != 0; --i) Game.undealCardFrom(w);
    i = Game.wasteDepth = this.oldWasteDepth;
    // unpack the cards that were there before, if necessary
    for(var card = w.lastChild; i > 0; --i, card = card.previousSibling)
      card.left = card._left = i * gHFanOffset;
  }
};
