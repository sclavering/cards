var Mod3 = new CardGame();

Mod3.init = function() {
  this.shortname = "mod3";
  this.initStacks(0,24,0,true,false,1,8);
  this.stockDealTargets = this.tableau[0]; // this is for the dealFromStock() functions in CardGame.js
  //
  var stacks = [];
  stacks = stacks.concat(this.foundations);
  stacks = stacks.concat(this.tableau[0]);
  this.dragDropTargets = stacks;
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
 
  this.score = 0;
  // deal
  while( this.score == 0 ){  // if the score is 0 the game is impossible! That'd be no fun...
    this.clearGame();
    cards = this.shuffle(cards);
    for(var i = 0; i < 8; i++){
      this.dealToStack(cards,this.foundations[i],0,1);
      if( this.foundations[i].firstChild.number()==2 )
        this.score +=5 ;
    }
    for(var i = 8; i < 16; i++){
      this.dealToStack(cards,this.foundations[i],0,1);
      if( this.foundations[i].firstChild.number()==3 )
        this.score +=5 ;
    }
    for(var i = 16; i < 24; i++){
      this.dealToStack(cards,this.foundations[i],0,1);
      if( this.foundations[i].firstChild.number()==4 )
        this.score +=5 ;
    }
    for(var i = 0; i < 8; i++)
      this.dealToStack(cards,this.tableau[0][i],0,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  }
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
    if(this.allstacks[i]==this.stock)
      continue;
    var card = this.allstacks[i].lastChild ;
    var targets = this.findTargets(card);
    for(var j=0; j<targets.length; j++){
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
  var targets = [];
  if(!card) 
    return targets;
  var row = (card.number() - 2) % 3;
  for(var j = row*8; j < (row*8+8); j++) {
    var stack = this.foundations[j];
    if(this.canMoveTo(card,stack)) {
        targets.push(stack);
    }
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
      if(!this.tableau[0][j].hasChildNodes()) {
        this.moveTo(card,this.tableau[0][j]);
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
  for(var i=0; i<8; i++){
    if(!this.tableau[0][i].hasChildNodes()) 
      continue;
    var card = this.tableau[0][i].lastChild;
    var targets = this.findTargets(card);
    if(targets.length) {
      // It's a pain when stuff automoves and you have to undo, so
      // to be conservative we'll limit ourselves to the patently obvious...
      for(var j = 0; j < targets.length; j++){
        if(this.goodAutoMove(card, targets[j])){
          this.moveTo(card,targets[j]);
          return true;
        }
      }
    }
  }
  // Nothing to do in tableau
  return false;
};
// Allow move if there is an equal or larger target in the row already
Mod3.goodAutoMove = function(card, target){
  var row = (this.baseCard(target)-2)*8;
  var targCard = target.lastChild;
  var started = 0;
  for(var c = row+7 ; c>=row; c--){
    if( this.foundations[c]==target ) continue; // Of course that one is there...
    var compCard = this.foundations[c].lastChild;
   	if(this.isInPlace(this.foundations[c])) started++;
    if (!targCard){ // Moving to a blank 
      // not 100% - but if you have 2 spaces what the hey...
      if(!compCard) return true;
      continue;
    } 
    if(!compCard ||                   // if its empty or
       !compCard.isSameSuit(card) ||  // different suit or
       !this.isInPlace(compCard))     // out of order, we can't get an OK
      continue;
    // Same suit and in place 
    return(compCard.number()>=targCard.number());
  }
  if(!targCard && started==7) // Go ahead and take the last spot if all the others are being used
  	return true;
  return false;
};

///////////////////////////////////////////////////////////
//// winning, scoring, undo
Mod3.hasBeenWon = function() {
  // Well, have we got all the points?
  return (this.score==480);
  // If we need the hard way again... 
  // game won if all stacks in top 3 rows have 4 cards
//   for(var i = 0; i < 24; i++)
//       if(this.foundations[i].childNodes.length!=4)
//         return false;
//   return true;
};

Mod3.getScoreForAction = function (action, card, source) {
  if ( action=="move-to-foundation" )  // Always good
    return 5;
  if ( action=="move-between-piles" && source.isFoundation && !this.canMoveTo(card, source) ) 
    return 5;   
  if ( action=="move-from-foundation" && this.canMoveTo(card, source) )
    return -5;
  return 0;
}

Games["Mod3"] = Mod3;
