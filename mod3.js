// Scoring constants:
const MOD3_CARD_IN_PLACE = 10, MOD3_EMPTY_TABLEAU = 5;
const MOD3_MAX_SCORE = 1000; // (96*MOD3_CARD_IN_PLACE + 8*MOD3_EMPTY_TABLEAU);

Games["mod3"] = {
  __proto__: BaseCardGame,

  id: "mod3",
  rule_dealFromStock: "to-piles",
  rule_canMoveCard: "last-on-pile",
  rule_canMoveToPile: "isempty",

  init: function() {
    var f = this.foundations;
    for(var i = 0; i < 24; i++) f[i].baseCardInPlace = function() {
      return (this.hasChildNodes() && this.firstChild.number()==this.baseNumber);
    };
    this.rows = [f.slice(0,8),f.slice(8,16),f.slice(16,24)];
    for(var j = 0; j != 3; j++) {
      for(var k = 0; k != 8; k++) this.rows[j][k].baseNumber = j + 2;
    }
  },

  deal: function() {
    var i;

    // get 2 decks, remove the aces, shuffle
    var cards = this.getCardDecks(2);
    cards.splice(91,1); cards.splice(78,1); cards.splice(65,1);
    cards.splice(52,1); cards.splice(39,1); cards.splice(26,1);
    cards.splice(13,1); cards.splice(0, 1);

    for(i = 0; i < 96; i++) {
      // the row this card should end up in
      cards[i].row = i % 3;
      // a renumbering of cards so that all foundations are built 0,1,2,3,
      // i.e. 2==0, 5==1, 8==2, J==3 in row 0, and similar in the other rows
      cards[i].rowNum = Math.floor((cards[i].number()-2) / 3);
    }

    // shuffle, and prevent games where that start with no cards in the correct place
    // on the foundations (because such games are impossible)
    var impossible = true;
    while(impossible) {
      cards = this.shuffle(cards);
      for(i = 95; impossible && i != 87; i--)
        if(cards[i].number()==2 || cards[i-8].number()==3 || cards[i-16].number()==4)
          impossible = false;
    }

    for(i = 0; i < 24; i++) this.dealToStack(cards,this.foundations[i],0,1);
    for(i = 0; i < 8; i++) this.dealToStack(cards,this.stacks[i],0,1);
    this.dealToStack(cards,this.stock,cards.length,0);

    // set the initial score
    for(i = 0; i < 24; i++) {
      var f = this.foundations[i];
      if(f.firstChild.number()==f.baseNumber) this.score += MOD3_CARD_IN_PLACE;
    }
  },

  canMoveToFoundation: function(card, stack) {
    if(card.parentNode == stack) return false;
    // row 2 has 2,5,8,J in it,  row 3 has 3,6,9,Q,  row 4 has 4,7,10,K
    if(!stack.hasChildNodes()) return (card.number()==stack.baseNumber);
    var last = stack.lastChild;
    return (card.isSameSuit(last) && card.number()==last.number()+3 && stack.baseCardInPlace());
  },

  getHints: function() {
    for(var i = 0; i < this.allstacks.length; i++) {
      var source = this.allstacks[i];
      if(source.isStock || !source.hasChildNodes()) continue;
      var card = source.lastChild;

      var row = this.rows[card.row];
      for(var j = 0; j < 8; j++) {
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
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.stacks;
    // it's inefficient to look at all foundations, but as this only happens when
    // the user middle clicks a card speed is probably not all that important
    return searchPiles(this.foundations, testCanMoveToFoundation(card))
        || searchPiles(piles, testPileIsEmpty);
  },

  autoplayMove: function() {
    for(var i = 0; i < 8; i++) {
      var card = this.stacks[i].lastChild;
      if(!card) continue;

      var row = this.rows[card.row];
      var f, c, ok, target = null;

      if(card.rowNum===0) {
        // we want to move it to an empty space, but only if there are no stray cards in the row
        // (otherwise we should leave the user to choose which specific cards to put in the spaces)
        ok = true;
        for(c = 0; ok && c != 8; c++) {
          f = row[c];
          if(f.hasChildNodes()) { if(f.firstChild.number()!=f.baseNumber) ok = false; }
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

  getScoreFor: function(actionObj) {
    var action = actionObj.action;

    if(action=="dealt-from-stock") {
      var score = 0;
      // how many empty piles are we going to fill?
      for(var j = 0; j < 8; j++)
        if(!this.stacks[j].hasChildNodes()) score -= MOD3_EMPTY_TABLEAU;
      return score;
    }

    // it's a MoveAction
    var card = actionObj.card, source = actionObj.source;
    switch(action) {
      case "move-to-foundation":
        // will we create an empty space?
        // source==card.parentNode for smartMove, but not if the card was dragged.
        var emptySpace = (source==card.parentNode ? !card.previousSibling : source.hasChildNodes());
        return MOD3_CARD_IN_PLACE + (emptySpace ? MOD3_EMPTY_TABLEAU : 0);
      case "move-from-foundation":
        // will we be moving the card out of position too?
        return -MOD3_EMPTY_TABLEAU - (source.baseCardInPlace() ? MOD3_CARD_IN_PLACE : 0);
      case "move-between-piles":
        if(source.isFoundation) {
          // is the card in place already?
          // again, we have to handle both drag+drop and smart move, so |card| might or might
          // not still be a child of |source|
          if((!source.hasChildNodes() && card.rowNum===0) || source.baseCardInPlace()) return 0;
          return MOD3_CARD_IN_PLACE;
        }
        // have we used up an empty space, or just moved the card from one space to another?
        if(source==card.parentNode ? !!card.previousSibling : !source.hasChildNodes()) return 0;
        return -MOD3_EMPTY_TABLEAU;
    }

    // just in case
    return 0;
  }
}
