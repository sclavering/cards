// Scoring constants:
const MOD3_CARD_IN_PLACE = 10, MOD3_EMPTY_PILE = 5;
const MOD3_MAX_SCORE = 1000; // (96*MOD3_CARD_IN_PLACE + 8*MOD3_EMPTY_PILE);

Games["mod3"] = {
  __proto__: BaseCardGame,

  id: "mod3",
  dealFromStock: "to piles",
  canMoveCard: "last on pile",
  canMoveToPile: "isempty",

  init: function() {
    // get 2 decks less the aces
    var cards = this.cards = getDecks(2);
    cards.splice(91,1); cards.splice(78,1); cards.splice(65,1);
    cards.splice(52,1); cards.splice(39,1); cards.splice(26,1);
    cards.splice(13,1); cards.splice(0, 1);

    // add useful properties to the cards
    for(i = 0; i != 96; i++) {
      // the row this card should end up in
      cards[i].row = i % 3;
      // a renumbering of cards so that all foundations are built 0,1,2,3,
      // i.e. 2==0, 5==1, 8==2, J==3 in row 0, and similar in the other rows
      cards[i].rowNum = Math.floor((cards[i].number-2) / 3);
    }

    // other useful things
    var f = this.foundations;
    for(var i = 0; i != 24; i++) f[i].baseCardInPlace = function() {
      return (this.hasChildNodes() && this.firstChild.number==this.baseNumber);
    };
    this.rows = [f.slice(0,8),f.slice(8,16),f.slice(16,24)];
    for(var j = 0; j != 3; j++) {
      for(var k = 0; k != 8; k++) this.rows[j][k].baseNumber = j + 2;
    }
  },

  deal: function(cards) {
    for(var i = 0; i != 24; i++) dealToPile(cards, this.foundations[i], 0, 1);
    for(i = 0; i != 8; i++) dealToPile(cards, this.piles[i], 0, 1);
    dealToPile(cards, this.stock, cards.length, 0);

    // set the initial score
    for(i = 0; i != 24; i++) {
      var f = this.foundations[i];
      if(f.firstChild.number==f.baseNumber) this.score += MOD3_CARD_IN_PLACE;
    }
  },

  // games that start with no cards in the correct place on the foundations are impossible
  shuffleImpossible: function(cards) {
    for(var i = 95; i != 87; i--)
      if(cards[i].number==2 || cards[i-8].number==3 || cards[i-16].number==4)
        return false;
    return true;
  },

  canMoveToFoundation: function(card, pile) {
    if(card.parentNode == pile) return false;
    // row 2 has 2,5,8,J in it,  row 3 has 3,6,9,Q,  row 4 has 4,7,10,K
    if(!pile.hasChildNodes()) return (card.number==pile.baseNumber);
    var last = pile.lastChild;
    return (card.isSameSuit(last) && card.number==last.number+3 && pile.baseCardInPlace());
  },

  getHints: function() {
    for(var i = 0; i != this.allpiles.length; i++) {
      var source = this.allpiles[i];
      if(source.isStock || !source.hasChildNodes()) continue;
      var card = source.lastChild;

      var row = this.rows[card.row];
      for(var j = 0; j != 8; j++) {
        var target = row[j];
        if(!this.canMoveTo(card,target)) continue;
        // hints are useful if:
        // - |target| is empty and in a different row (so we don't suggest moving a 2/3/4 along a row)
        // - |target| is nonempty, and |card| is the only card in |source|
        if(source.isFoundation && (target.hasChildNodes()
            ? card.previousSibling : source.parentNode==target.parentNode)) continue;
        this.addHint(card, target);
      }
    }
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(this.rows[card.row], testCanMoveToFoundation(card))
        || searchPiles(piles, testPileIsEmpty);
  },

  autoplayMove: function() {
    for(var i = 0; i != 8; i++) {
      var card = this.piles[i].lastChild;
      if(!card) continue;

      var row = this.rows[card.row];
      var f, c, ok, target = null;

      if(card.rowNum===0) {
        // we want to move it to an empty space, but only if there are no stray cards in the row
        // (otherwise we should leave the user to choose which specific cards to put in the spaces)
        ok = true;
        for(c = 0; ok && c != 8; c++) {
          f = row[c];
          if(f.hasChildNodes()) { if(f.firstChild.number!=f.baseNumber) ok = false; }
          else if(!target) target = f;
        }
      } else {
        // find where to move |card| to, and check that the other foundation on the row for the
        // same suit has reached at least the same height
        ok = false;
        for(c = 0; !target && c != 8; c++) {
          if(this.canMoveTo(card, row[c])) target = row[c];
        }
        for(c = 0; !ok && c != 8; c++) {
          f = row[c];
          var last = f.lastChild;
          if(f!=target && f.baseCardInPlace() && last.isSameSuit(card)
              && last.rowNum>=card.rowNum-1) ok = true;
        }
      }

      if(ok && target) return this.moveTo(card, target);
    }
    return false;
  },

  hasBeenWon: function() {
    return (this.score==MOD3_MAX_SCORE);
  },

  getScoreFor: function(action) {
    var score = 0;

    if(action.action=="dealt-from-stock") {
      // how many empty piles are we going to fill?
      for(var j = 0; j != 8; j++)
        if(!this.piles[j].hasChildNodes()) score -= MOD3_EMPTY_PILE;
      return score;
    }

    // it's a MoveAction
    var card = action.card, source = action.source, destination = action.destination;
    // if the user dragged+dropped the card then the source isn't the card's parent node, but if they
    // right-clicked it then it will be.
    var notInSource = card.parentNode!=source;

    if(source.isFoundation) {
      if(notInSource ? this.canMoveTo(card,source) : source.baseCardInPlace()) score -= MOD3_CARD_IN_PLACE;
    } else {
      if(notInSource ? !source.hasChildNodes() : !card.previousSibling) score += MOD3_EMPTY_PILE;
    }
    if(destination.isFoundation) score += MOD3_CARD_IN_PLACE;
    else if(!destination.hasChildNodes()) score -= MOD3_EMPTY_PILE;

    return score;
  }
}
