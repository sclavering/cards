var Yukon = new CardGame();

Yukon.shortname = "yukon";



///////////////////////////////////////////////////////////
//// start game
Yukon.deal = function() {
  var cards = this.shuffleDecks(1);
  this.dealToStack(cards,this.stacks[0],0,1);
  for(var i = 1; i < 7; i++) this.dealToStack(cards,this.stacks[i],i,5);
};



///////////////////////////////////////////////////////////
//// Moving
Yukon.canMoveToPile = function(card, stack) {
  var lc = stack.lastChild; // last card
  if(!lc) return true; // !lc && card.isKing()
  // or last card (lc) in stack opposite colour and 1 greater than dragged card,
  return (lc.faceUp() && lc.notSameColour(card) && lc.isConsecutiveTo(card));
};



///////////////////////////////////////////////////////////
//// Hints
Yukon.getHints = function() {
  // hints in Yukon are weird.  we look at the last card on each stack for targets, then go and find
  // cards which could be moved there. (this is because any faceUp card can be moved in Yukon)
  for(var i = 0; i < 7; i++) {
    this.getHintsForCard(this.stacks[i].lastChild);
  }
};
// take a card a find another card on a differnt stack of opposite colour and one less in rank
Yukon.getHintsForCard = function(card) {
  if(!card) return;
  for(var i = 0; i < 7; i++) {
    var stack = this.stacks[i];
    if(stack==card.parentNode) continue;
    var current = stack.lastChild;
    while(current && current.faceUp()) {
      if(card.isConsecutiveTo(current) && card.notSameColour(current)) {
        // |current| could be moved onto |card|.  test if it's not already
        // on a card consecutive and of opposite colour
        var prev = current.previousSibling;
        if(!prev || !prev.isConsecutiveTo(current) || !prev.notSameColour(current))
          this.addHint(current,card.parentNode);
      }
      current = current.previousSibling;
    }
  }
};



///////////////////////////////////////////////////////////
//// smart move
// finds the first stack from the left where the card can be moved to
Yukon.getBestMoveForCard = function(card) {
  for(var i = 0; i < 7; i++) {
    var stack = this.stacks[i];
    if(stack!=card.parentNode && stack.hasChildNodes() && this.canMoveTo(card,stack)) return stack;
  }
  for(var i = 0; i < 7; i++) {
    var stack = this.stacks[i];
    if(stack!=card.parentNode && this.canMoveTo(card,stack)) return stack;
  }
};



///////////////////////////////////////////////////////////
//// Autoplay
Yukon.autoplayMove = function() {
  // move stuff to foundations
  for(var i = 0; i < this.stacks.length; i++) {
    var last = this.stacks[i].lastChild;
    if(last && this.canMoveCard(last) && this.canAutoplayCard(last)
      && this.sendToFoundations(last)) return true;
  }
  return false;
};

// card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
Yukon.canAutoplayCard = function(card) {
  if(card.isAce() || card.number()==2) return true;
  return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 2);
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
Yukon.hasBeenWon = function() {
  // game won if all 4 Foundations have 13 cards
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=13)
      return false;
  return true;
};
Yukon.getScoreForAction = function(action) {
  return (
    action=="move-to-foundation"   ?  10 :
    action=="card-revealed"        ?   5 :
    action=="move-from-foundation" ? -15 :
    0);
};


Games["Yukon"] = Yukon;
