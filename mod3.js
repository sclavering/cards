var Mod3 = new CardGame();

Mod3.init = function() {
  this.shortname = "mod3";
  this.initStacks(0,0,0,true,false,4,8);
  this.stockDealTargets = this.tableau[3]; // this is for the dealFromStock() functions in CardGame.js
  //
  var stacks = [];
  for(var i = 0; i < 4; i++)
    stacks = stacks.concat(this.tableau[i]);
  this.dragDropTargets = stacks;
};



///////////////////////////////////////////////////////////
//// start game
Mod3.deal = function() {
  // get 2 decks, remove the aces, shuffle
  var cards = this.getCardDecks(2);
  cards.splice(91,1); cards.splice(78,1); cards.splice(65,1);
  cards.splice(52,1); cards.splice(39,1); cards.splice(26,1);
  cards.splice(13,1); cards.splice(0, 1);
  cards = this.shuffle(cards);
  // deal
  for(var i = 0; i < 4; i++)
    for(var j = 0; j < 8; j++)
      this.dealToStack(cards,this.tableau[i][j],0,1);
  this.dealToStack(cards,this.stock,cards.length,0);
};



///////////////////////////////////////////////////////////
//// Moving
//Mod3.canMoveCard = Mod3.canMoveCard_LastOnPile;
Mod3.canMoveCard = function(card) {
  return (card.faceUp() && card.isLastOnPile());
};
Mod3.canMoveTo = function(card, stack) {
  var r = stack.row;
  if(stack.row!=3) {
    // row 0 has 2,5,8,J in it,  row 1 has 3,6,9,Q,  row 2 has 4,7,10,K
    if(!stack.hasChildNodes()) return (card.number()==stack.row+2);
    var last = stack.lastChild;
    return (card.isSameSuit(last) && card.number()==last.number()+3
      && last.number()==(r-1)+3*stack.childNodes.length);
  }
  // anything may be moved into an empty space in 4th row (row 3)
  return !stack.hasChildNodes();
};



///////////////////////////////////////////////////////////
//// hint
Mod3.getHints = function() {
  for(var i = 0; i < 4; i++) {
    for(var j = 0; j < 8; j++) {
      this.getHintsForCard(this.tableau[i][j].lastChild);
    }
  }
};
// searches the appropriate row for a place to put the current card being examined for getHint
Mod3.getHintsForCard = function(card) {
  if(!card) return;
  var row = (card.number() - 2) % 3;
  for(var j = 0; j < 8; j++) {
    var stack = this.tableau[row][j];
    if(this.canMoveTo(card,stack)) {
      // cases where the hint is useful are:
      //  - the target is an empty stack, but not on the same row the card is already on
      //    (this applies for 2,3,4's, prevents us from suggesting moving the card along the row)
      //  - the card is in rows 0-2 and is not on top of another card
      //    (this is so we don't suggest moving a 5H from one 2H to another)
      //  - the card is in row 3
      if(card.parentNode.row==3
          || (stack.hasChildNodes() && card.previousSibling==null)
          || (!stack.hasChildNodes() && card.parentNode.row!=row))
        this.addHint(card,stack);
    }
  }
};



///////////////////////////////////////////////////////////
//// smart move
Mod3.smartMove = function(card) {
  if(!this.canMoveCard(card)) return false;
  var targets = this.findTargets(card);
  if(targets.length) {
    this.moveTo(card,targets[0]);
    return true;
  } else {
    // try and move to an empty space in the 4th row
    for(var j = 0; j < 8; j++) {
      if(!this.tableau[3][j].hasChildNodes()) {
        this.moveTo(card,this.tableau[3][j]);
        return true;
      }
    }
  }
  return false;
};
//XXX no longer used in hints, so might be able to clean up
Mod3.findTargets = function(card) {
  var targets = [];
  var row = (card.number() - 2) % 3;
  for(var j = 0; j < 8; j++) {
    var stack = this.tableau[row][j];
    if(this.canMoveTo(card,stack)) {
      // cases where the hint is useful are:
      //  - the target is an empty stack, but not on the same row the card is already on
      //    (this applies for 2,3,4's, prevents us from suggesting moving the card along the row)
      //  - the card is in rows 0-2 and is not on top of another card
      //    (this is so we don't suggest moving a 5H from one 2H to another)
      //  - the card is in row 3
      if(card.parentNode.row==3
          || (stack.hasChildNodes() && card.previousSibling==null)
          || (!stack.hasChildNodes() && card.parentNode.row!=row))
        targets.push(stack);
    }
  }
  return targets;
};



///////////////////////////////////////////////////////////
//// Autoplay



///////////////////////////////////////////////////////////
//// winning, scoring, undo
Mod3.hasBeenWon = function() {
  // game won if all stacks in top 3 rows have 4 cards
  for(var i = 0; i < 3; i++)
    for(var j = 0; j < 8; j++)
      if(this.tableau[i][j].childNodes.length!=4)
        return false;
  return true;
};


Games["Mod3"] = Mod3;
