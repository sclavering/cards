var Golf = new CardGame();

Golf.init = function() {
  this.shortname = "golf";
  this.initStacks(7,1,0,true,false);
  this.dragDropTargets = [this.foundation];
  this.stockDealTargets = this.dragDropTargets;
};


///////////////////////////////////////////////////////////
//// start game
Golf.deal = function() {
  var cards;
  var cardsPerColumn;
  if(this.difficultyLevel==3) { 
	  cards = this.shuffleDecks(2);
    cardsPerColumn = 8;
  	this.score = 103;
  } else {
	  cards = this.shuffleDecks(1);
    cardsPerColumn = 5;
  	this.score = 51;
	}	  
	for(var i = 0; i < 7; i++) 
	  this.dealToStack(cards,this.stacks[i],0,cardsPerColumn);
	this.dealToStack(cards,this.foundation,0,1);
	this.dealToStack(cards,this.stock,cards.length,0);
};



///////////////////////////////////////////////////////////
//// Moving
Golf.canMoveCard = function(card) {
  // cards on foundation cannot be moved
  if(card.parentNode == this.foundation || !card.isLastOnPile()) 
  	return false;
	return true;
};

Golf.canMoveTo = function(card, stack) {
  if(stack != this.foundation) 
    return false;
  // cards on foundation cannot be moved
  var diff = this.foundation.lastChild.number() - card.number();
  return (diff ==  1 || //Can go one down
          diff == -1 || //Can go one up
         (this.difficultyLevel==1 && 
          (diff == -12 || diff == 12)));  //Or King to Ace in easy mode
};



///////////////////////////////////////////////////////////
//// hint
Golf.getHints = function() {
  for(var i = 0; i < 7; i++) {
    var card = this.stacks[i].lastChild;
    if(card && this.canMoveTo(card, this.foundation))
    	this.addHint(card,this.foundation);
  }
};



///////////////////////////////////////////////////////////
//// smartmove (moves cards clicked with middle button to best possible destination
Golf.smartMove = function(card) {
	if(this.canMoveTo(card, this.foundation)) {
		this.moveTo(card, this.foundation);
		return true;
	}
  return false;
};


///////////////////////////////////////////////////////////
//// Autoplay
Golf.autoplayMove = function() {
	var card = this.stock.lastChild;

	if(card && card.faceUp()) {  // We must have just flipped it... see below...
		card.moveTo(this.foundation);
		this.trackMove("dealt-from-stock", null, null);
		return true;
	}

	var allEmpty = true;
	// If there are no moveable cards move a card from the stock to the foundation
	// (Any possible moves might be delayed as strategy otherwise...)
	for(var i = 0; i<7; i++) {
		card = this.stacks[i].lastChild;
		if(card) {
		  allEmpty = false;
			if(this.canMoveTo(card, this.foundation))
				return false;
		}
	}
	
  // dealFromStock doesn't animate, so it's easy to miss...  we can do it ourself
	card = this.stock.lastChild;
  // If we want to move a card, first we'll flip it, then next autoplay will move it.
	if(card) { 
		card.turnFaceUp();
		return true;
	}
	return false;
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
Golf.hasBeenWon = function() {
	return (this.score == 0);
};

Golf.getScoreForAction = function(action) {
  if(action=="move-to-foundation" || action=="dealt-from-stock") 
  	return -1;
  return 0;
};


Games["Golf"] = Golf;
