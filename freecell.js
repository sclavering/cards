Games["freecell"] = {
  __proto__: FreeCellGame,

  id: "freecell",


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.shuffleDecks(1);
    var i;
    for(i = 0; i < 4; i++) this.dealToStack(cards,this.stacks[i],0,7);
    for(i = 4; i < 8; i++) this.dealToStack(cards,this.stacks[i],0,6);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  rule_canMoveCard: "descending,alt-colours",
  rule_canMoveToPile: "descending,alt-colours",

  // this checks if there are enough spaces/cells to perform a move, not just is it is allowed.
  movePossible: function(card,target) {
    // XXX destinaton should be usable in moves, but the moving algorithms are slightly broken
    // count spaces, excluding the destination
    var spaces = 0;
    for(var i = 0; i < 8; i++)
      if(!this.stacks[i].hasChildNodes() && this.stacks[i]!=target) spaces++;
    var cells = this.countEmptyCells();
    // this is the number we can move using the most complex algorithm
    var numCanMove = (cells+1) * (1 + (spaces * (spaces + 1) / 2));
    // count number of cards to move
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;
    //
    return numToMove<=numCanMove;
  },


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    var card, i;
    for(i = 0; i < 4; i++) {
      this.getHintsForCard(this.cells[i].firstChild);
    }
    for(i = 0; i < 8; i++) {
      card = this.getLowestMoveableCard_AltColours(this.stacks[i]);
      this.getHintsForCard(card);
    }
  },
  getHintsForCard: function(card) {
    if(!card) return;
    var stack, i;
    for(i = 0; i < 8; i++) {
      stack = this.stacks[i];
      if(this.canMoveTo(card,stack)) this.addHint(card,stack);
    }
    for(i = 0; i < 4; i++) {
      stack = this.foundations[i];
      if(this.canMoveTo(card,stack)) this.addHint(card,stack);
    }
  },


  ///////////////////////////////////////////////////////////
  //// smartmove
  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.stacks;
    return searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testCanMoveToEmptyPile(card))
        || (!card.nextSibling && (
             searchPiles(this.cells, testPileIsEmpty)
          || searchPiles(this.foundations, testCanMoveToFoundation(card))));
  },


  ///////////////////////////////////////////////////////////
  //// Autoplay
  autoplayMove: function() {
    var i, last;
    for(i = 0; i < 4; i++) {
      last = this.cells[i].firstChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    for(i = 0; i < 8; i++) {
      last = this.stacks[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },
  // card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
  canAutoplayCard: function(card) {
    if(card.isAce() || card.number()==2) return true;
    return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 2);
  },


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
  hasBeenWon: function() {
    for(var i = 0; i < 4; i++)
      if(this.foundations[i].childNodes.length!=13) return false;
    return true;
  }
};
