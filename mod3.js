var Mod3 = new CardGame();

// Scoring constants:
const CARD_IN_PLACE = 10, EMPTY_TABLEAU = 5;

Mod3.init = function() {
  this.shortname = "mod3";
  this.initStacks(8,24,0,true,false);
  this.stockDealTargets = this.stacks;
  this.dragDropTargets = this.stacks.concat(this.foundations);
};
// Given the nature of Mod 3 we often need to know which row a stack is in
Mod3.baseCard = function( stack ){
  if( !stack || !stack.isFoundation ) return 0;
  // Should be the row in the form "mod3-rowX" where X is 1, 2 or 3
  return parseInt(stack.parentNode.id.substr(8))+1;
};
// True if there is a point scoring card in this spot
Mod3.isInPlace = function( stack ){
  if( stack.isCard ) stack=stack.parentNode;
  if( !stack.isFoundation || stack.childNodes.length==0 ||
      stack.firstChild.number()!=this.baseCard(stack) ) return false;
  return true;
};



///////////////////////////////////////////////////////////
//// start game
Mod3.deal = function() {
  // get 2 decks, remove the aces, shuffle
  var cards = this.getCardDecks(2);
  cards.splice(91,1); cards.splice(78,1); cards.splice(65,1);
  cards.splice(52,1); cards.splice(39,1); cards.splice(26,1);
  cards.splice(13,1); cards.splice(0, 1);

  this.clearGame();
  var possible = false;
  while( !possible ){ // Deal until we get came with at least a sporting chance
    var cardindex = cards.length - 1;
    cards = this.shuffle(cards);
    this.score = 0;
    var inplace = new Array(3); // three target rows
    var inplay = new Array(3);
    for(var targetRow = 0; targetRow <3; targetRow++ ){
      inplace[targetRow] = Array(4); // four suits
      inplay[targetRow] = Array(4);
    }
    for(var row = 0; row <3; row++){
      for(var i = 0; i < 8; i++){
        var currCard = cards[cardindex--];
        if( currCard.number() == row+2 ){
          inplace[row][currCard.suit()-SPADE] = true;
          this.score += CARD_IN_PLACE;
        } else {
          inplay[((currCard.number()-2)%3)][currCard.suit()-SPADE] = true;
        }
      }
    }

    // We have cards in place but still need cards to play on them
    for(var base = 0; base<3; base++){
      for(var suit = SPADE; suit <= CLUB; suit++){
        // XXX js strict warnings here
        if( inplace[base][suit] && inplay[base][suit] ){
          possible = true; // yeah!
          break;
        }
      }
    }
  }
  // Now that we have ok cards, deal them out
  for(var i = 0; i < 24; i++) this.dealToStack(cards,this.foundations[i],0,1);
  for(var i = 0; i < 8; i++) this.dealToStack(cards,this.stacks[i],0,1);
  this.dealToStack(cards,this.stock,cards.length,0);
  this.updateScoreDisplay();
};



///////////////////////////////////////////////////////////
//// Moving
//Mod3.canMoveCard = Mod3.canMoveCard_LastOnPile;
Mod3.canMoveCard = function(card) {
  if(card.parentNode.length == 4) // Pile is done.
    return false;
  return (card.faceUp() && card.isLastOnPile());
};

Mod3.canMoveTo = function(card, stack) {
  if(card.parentNode == stack)
    return false; // Maybe we could, but why???
  if(!stack.isFoundation)
    // anything may be moved into an empty space in 4th row (row 3)
    return !stack.hasChildNodes();
  // convert the foundation name to row number
  var row = this.baseCard(stack);
  // row 2 has 2,5,8,J in it,  row 3 has 3,6,9,Q,  row 4 has 4,7,10,K
  if(!stack.hasChildNodes())
    return (card.number()==row);
  return (card.isSameSuit(stack.lastChild) && card.number()==stack.lastChild.number()+3
    && stack.firstChild.number()==row);
};



///////////////////////////////////////////////////////////
//// hint
Mod3.getHints = function() {
  for(var i = this.allstacks.length-1; i >=0; i--) {
    if(this.allstacks[i]==this.stock) continue;
    var card = this.allstacks[i].lastChild ;
    var targets = this.findTargets(card);
    for(var j = 0; j < targets.length; j++){
      var onCard = targets[j].lastChild;
      // cases where the hint would be useful are:
      //  - the target is an empty stack in another row that isn't the tableau
      //    (this applies for 2,3,4's, prevents us from hinting the card along the row)
      if((!onCard && card.parentNode.parentNode!=targets[j].parentNode && targets[j].isFoundation)
         || (onCard && // Moving to a card...
            // From nothing..      or from a different card
            (!card.previousSibling || card.previousSibling.className!=onCard.className))){
        this.addHint(card, targets[j]);
      }
      // Otherwise while legal, the move doesn't buy you a lot...
    }
  }
};

// searches the foundation (only!) for a place to put the card
Mod3.findTargets = function(card) {
  if(!card) return [];
  var targets = [];
  var row = (card.number() - 2) % 3;
  for(var j = row*8; j < (row*8+8); j++) {
    var stack = this.foundations[j];
    if(this.canMoveTo(card,stack)) targets.push(stack);
  }
  return targets;
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
      if(!this.stacks[j].hasChildNodes()) {
        this.moveTo(card,this.stacks[j]);
        return true;
      }
    }
  }
  return false;
};



///////////////////////////////////////////////////////////
//// Autoplay
// Try to automate some moves, but not all of them
Mod3.autoplayMove = function (){
  for(var i = 0; i < 8; i++) {
    var card = this.stacks[i].lastChild;
    if(!card) continue;
    
    var targets = this.findTargets(card);
    if(targets.length==0) continue;
    
    // It's a pain when stuff automoves and you have to undo, so
    // to be conservative we'll limit ourselves to the patently obvious...
    for(var j = 0; j < targets.length; j++) {
      if(this.goodAutoMove(card, targets[j])) {
        this.moveTo(card,targets[j]);
        return true;
      }
    }
  }
  return false;
};

Mod3.goodAutoMove = function(card, target) {
  var c;
  var row = (this.baseCard(target)-2)*8;
  var targCard = target.lastChild;
  if(!targCard) { // We are considering a move to an empty foundation pile
    for(c = row + 7; c >= row; c--) {
      if(this.foundations[c].lastChild && !this.isInPlace(this.foundations[c])) return false;
    }
    // Every slot was empty or in place
    return true;
  }
  // Moving on top of another card
  // Allow move if there is an equal or larger target in the row already
  for(c = row + 7; c >= row; c--) {
    var compCard = this.foundations[c].lastChild;
    // If are an
    if(this.foundations[c]==target) continue; // Of course that one is there...
    if(!compCard ||                   // if its empty or
       !compCard.isSameSuit(card) ||  // different suit or
       !this.isInPlace(compCard))     // out of order, we can't get an OK
      continue;
    // Same suit and in place
    return (compCard.number()>=targCard.number());
  }
  return false;
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo

// const CARD_IN_PLACE and EMPTY_TABLEAU defined at top

Mod3.hasBeenWon = function() {
  // Well, have we got all the points?
  return (this.score==(96*CARD_IN_PLACE + 8*EMPTY_TABLEAU));
};

Mod3.getScoreForAction = function(action, card, source) {
  var score = 0;
  if(action=="move-from-foundation") {
    // Moving out of position
    if(this.canMoveTo(card, source)) return (0 - CARD_IN_PLACE - EMPTY_TABLEAU);
    // Just taking up a slot
    return (0 - EMPTY_TABLEAU);
  }
  if(action=="move-to-foundation") {
    if(!source.firstChild) return CARD_IN_PLACE + EMPTY_TABLEAU; // Emptied a slot
    return CARD_IN_PLACE; // Only put a card in position
  }
  if(action=="move-between-piles") {
    if(source.isFoundation) {
      // Move from dealt postion to valid one
      if(!this.canMoveTo(card, source)) return CARD_IN_PLACE;
      return 0;  // Moving from valid to valid foundation
    }
    if(source.firstChild) return (0 - EMPTY_TABLEAU);  // Moving from another card in tableau to fill an empty
    return 0; // Moving from one empty tableau to another
  }
  if(action=="dealt-from-stock") {
    // This gets called after the deal - figure out how many piles were covered
    for(var j = 0; j < 8; j++ ) {
      // if this was filled
      if(this.stacks[j].childNodes.length==1) score -= EMPTY_TABLEAU;
    }
    return score;
  }
  return 0;
}

Games["Mod3"] = Mod3;
