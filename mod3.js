// Scoring constants:
const MOD3_CARD_IN_PLACE = 10, MOD3_EMPTY_TABLEAU = 5;
const MOD3_MAX_SCORE = (96*MOD3_CARD_IN_PLACE + 8*MOD3_EMPTY_TABLEAU);

var Mod3 =
Games["mod3"] = {
  __proto__: BaseCardGame,

  id: "mod3",
  
  rule_dealFromStock: "to-stacks",


  init: function() {
    this.stockDealTargets = this.stacks;
    var i;
    for(i = 0;  i < 8;  i++) this.foundations[i].baseNumber = 2;
    for(i = 8;  i < 16; i++) this.foundations[i].baseNumber = 3;
    for(i = 16; i < 24; i++) this.foundations[i].baseNumber = 4;
    for(i = 0;  i < 8;  i++) this.foundations[i].row = 0;
    for(i = 8;  i < 16; i++) this.foundations[i].row = 1;
    for(i = 16; i < 24; i++) this.foundations[i].row = 2;
    for(i = 0; i < 24; i++) this.foundations[i].baseCardInPlace = function() {
      return (this.hasChildNodes() && this.firstChild.number()==this.baseNumber);
    };
  }
};



///////////////////////////////////////////////////////////
//// start game
Mod3.deal = function() {
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

  cards = this.shuffle(cards);

  for(i = 0; i < 24; i++) this.dealToStack(cards,this.foundations[i],0,1);
  for(i = 0; i < 8; i++) this.dealToStack(cards,this.stacks[i],0,1);
  this.dealToStack(cards,this.stock,cards.length,0);

  // set the initial score
  for(i = 0; i < 24; i++) {
    var f = this.foundations[i];
    if(f.firstChild.number()==f.baseNumber) this.score += MOD3_CARD_IN_PLACE;
  }
};



///////////////////////////////////////////////////////////
//// Moving
Mod3.rule_canMoveCard = "last-on-pile";
Mod3.rule_canMoveToPile = "isempty";

Mod3.canMoveToFoundation = function(card, stack) {
  if(card.parentNode == stack) return false;
  // row 2 has 2,5,8,J in it,  row 3 has 3,6,9,Q,  row 4 has 4,7,10,K
  if(!stack.hasChildNodes()) return (card.row==stack.row && card.rowNum===0);
//  if(!stack.hasChildNodes()) return (card.number()==stack.baseNumber);
  var last = stack.lastChild;
  return (card.isSameSuit(last) && card.number()==last.number()+3 && stack.baseCardInPlace());
};



///////////////////////////////////////////////////////////
//// hint
Mod3.getHints = function() {
  for(var i = 0; i < this.allstacks.length; i++) {
    var source = this.allstacks[i];
    if(source.isStock || !source.hasChildNodes()) continue;
    var card = source.lastChild;
    
    var rowStart = card.row * 8;
    for(var j = 0; j < 8; j++) {
      var target = this.foundations[rowStart+j];
      if(!this.canMoveTo(card,target)) continue;
      // hints are useful if:
      // - |target| is empty and in a different row (so we don't suggest moving a 2/3/4 along a row)
      // - |target| is nonempty, and |card| is the only card in |source|
      if(source.isFoundation && (target.hasChildNodes()
          ? card.previousSibling : source.parentNode==target.parentNode)) continue;
      this.addHint(card, target);
    }
  }
};



///////////////////////////////////////////////////////////
//// smart move
Mod3.getBestMoveForCard = function(card) {
  var i;
  // to a foundation
  var rowStart = card.row * 8, rowEnd = rowStart + 8;
  for(i = rowStart; i < rowEnd; i++) {
    var pile = this.foundations[i];
    if(this.canMoveTo(card,pile)) return pile;
  }
  // or to a space in the 4th row
  var parent = card.parentNode;
  var piles = parent.isNormalPile ? this.getPilesRound(parent) : this.stacks;
  for(i = 0; i < piles.length; i++)
    if(!piles[i].hasChildNodes())
      return piles[i];
  return null;
};



///////////////////////////////////////////////////////////
//// Autoplay
Mod3.autoplayMove = function() {
  for(var i = 0; i < 8; i++) {
    var card = this.stacks[i].lastChild;
    if(!card) continue;

    var rowStart = card.row * 8, rowEnd = rowStart + 8;
    var target = null;
    var f, c, ok;

    if(card.rowNum===0) {
      // we want to move it to an empty space, but only if there are no stray cards in the row
      // (otherwise we should leave the user to choose which specific cards to put in the spaces)
      ok = true;
      for(c = rowStart; ok && c < rowEnd; c++) {
        f = this.foundations[c];
        if(f.hasChildNodes()) { if(f.firstChild.number()!=f.baseNumber) ok = false; }
        else if(!target) target = f;
      }
    } else {
      // find where to move |card| to, and check that the other foundation on the row for the
      // same suit has reached at least the same height
      ok = false;
      for(c = rowStart; !target && c < rowEnd; c++) {
        f = this.foundations[c];
        if(this.canMoveTo(card, f)) target = f;
      }
      for(c = rowStart; !ok && c < rowEnd; c++) {
        f = this.foundations[c];
        var last = f.lastChild;
        if(f!=target && f.baseCardInPlace() && last.isSameSuit(card)
            && last.rowNum>=card.rowNum-1) ok = true;
      }
    }

    if(!ok || !target) continue;
    this.moveTo(card, target);
    return true;
  }
  return false;
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
Mod3.hasBeenWon = function() {
  return (this.score==MOD3_MAX_SCORE);
};

Mod3.getScoreForAction = function(action, card, source) {
  switch(action) {
  case "move-from-foundation":
    // Moving out of position
    if(this.canMoveTo(card, source)) return (0 - MOD3_CARD_IN_PLACE - MOD3_EMPTY_TABLEAU);
    // Just taking up a slot
    return (0 - MOD3_EMPTY_TABLEAU);

  case "move-to-foundation":
    if(!source.firstChild) return MOD3_CARD_IN_PLACE + MOD3_EMPTY_TABLEAU; // Emptied a slot
    return MOD3_CARD_IN_PLACE; // Only put a card in position

  case "move-between-piles":
    if(source.isFoundation) {
      // Move from dealt postion to valid one
      if(!this.canMoveTo(card, source)) return MOD3_CARD_IN_PLACE;
      return 0;  // Moving from valid to valid foundation
    }
    if(source.firstChild) return (0 - MOD3_EMPTY_TABLEAU);  // Moving from another card in tableau to fill an empty
    return 0; // Moving from one empty tableau to another

  case "dealt-from-stock":
    var score = 0;
    // how many piles were empty before we dealed?
    for(var j = 0; j < 8; j++)
      if(this.stacks[j].childNodes.length==1)
        score -= MOD3_EMPTY_TABLEAU;
    return score;
  }
  return 0;
}
