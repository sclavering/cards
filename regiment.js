Games.regiment = true;

AllGames.regiment = {
  __proto__: BaseCardGame,

  id: "regiment",
  cards: 2,
  canMoveCard: "last on pile",

  init: function() {
    var cards = this.cards = getDecks(1).concat(getDecks(1)); // I want a certain ordering

    for(var i = 0; i != 8; i++) {
      this.foundations[i].isAceFoundation = (i < 4);
      this.reserves[i].col = i;
      this.piles[i].col = i;
      this.piles[i+8].col = i;
    }
    this.autoplayFrom = this.piles.concat(this.reserves);
    this.aceFoundations = this.foundations.slice(0,4);
    this.kingFoundations = this.foundations.slice(4,8);

    var acepos = [0, 13, 26, 39, 52, 65, 78, 91];
    var aces = this.aces = new Array(8);
    var kings = this.kings = new Array(8);
    for(i = 0; i != 8; i++) aces[i] = cards[acepos[i]], kings[i] = cards[acepos[i]+12];

    for(i = 0; i != 52; i++) cards[i].twin = cards[i+52], cards[i+52].twin = cards[i];

    // it's easy enough to look at both card.up and card.twin.up
    for(i = 1; i != 103; i++) cards[i].up = cards[i+1], cards[i].down = cards[i-1];
    cards[0].up = cards[1]; cards[103].down = cards[102];
    for(i = 0; i != 8; i++) aces[i].down = null, kings[i].up = null;
  },

  deal: function(cards) {
    for(var i = 0; i != 16; i++) dealToPile(cards,this.piles[i],0,1);
    for(i = 0; i != 8; i++) dealToPile(cards,this.reserves[i],10,1);
  },

  canMoveToFoundation: function(card, pile) {
    var last = pile.lastChild, twinp = card.twin.parentNode;
    if(pile.isAceFoundation) {
      // can't start a second ace foundation for a suit
      if(card.isAce) return !last && !(twinp.isFoundation && twinp.isAceFoundation);
      return last && card.isConsecutiveTo(last) && card.isSameSuit(last);
    }

    if(card.isKing) return !last && !(twinp.isFoundation && !twinp.isAceFoundation);
    return last && last.isConsecutiveTo(card) && card.isSameSuit(last);
  },

  canMoveToPile: function(card, target) {
    var source = card.parentNode.source;
    var last = target.lastChild;

    // piles are built up or down (or both) within suit
    if(last) return (card.isSameSuit(last) && card.differsByOneFrom(last));

    // can only move to an empty pile from the closest reserve pile(s)
    if(!source.isReserve) return false;

    var tcol = target.col, scol = source.col;
    if(tcol==scol) return true;
    if(this.reserves[tcol].hasChildNodes()) return false;

    var coldiff = Math.abs(tcol-scol);
    var piles = getPilesRound(this.reserves[tcol]);
    for(var i = 0; i!=piles.length && Math.abs(piles[i].col-tcol)!=coldiff; i++)
      if(piles[i].hasChildNodes()) return false;
    return true;
  },

  getHints: function() {
    for(var i = 0; i != 8; i++) this.addHintsFor(this.reserves[i].lastChild);
    for(i = 0; i != 16; i++) this.addHintsFor(this.piles[i].lastChild);
  },

  getBestMoveForCard: function(card) {
    return searchPiles(this.piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(this.piles, testCanMoveToEmptyPile(card));
  },

  autoplayMove: function(pileWhichHasHadCardsRemoved) {
    var i, pile, last, card;
    if(pileWhichHasHadCardsRemoved) {
      pile = pileWhichHasHadCardsRemoved;
      if(pile.isNormalPile && !pile.hasChildNodes() && this.reserves[pile.col].hasChildNodes())
        return this.moveTo(this.reserves[pile.col].lastChild, pile);
    }

    for(i = 0; i != 4; i++) {
      pile = this.foundations[i], last = pile.lastChild;
      if(last && last.up && last.twin.parentNode.isFoundation) {
        card = last.up.parentNode.isFoundation ? last.twin.up : last.up;
        if(!card.nextSibling) return this.moveTo(card, pile);
      }
    }
    for(i = 4; i != 8; i++) {
      pile = this.foundations[i], last = pile.lastChild;
      if(last && last.down && last.twin.parentNode.isFoundation) {
        card = last.down.parentNode.isFoundation ? last.twin.down : last.down;
        if(!card.nextSibling) return this.moveTo(card, pile);
      }
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :  10,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
};
