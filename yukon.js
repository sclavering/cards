var Yukon = new CardGame();

Yukon.init = function() {
  this.shortname = "yukon";
  this.initStacks(7,4);
  this.thingsToReveal = this.stacks;
  this.dragDropTargets = this.stacks.concat(this.foundations);
};



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
Yukon.getHint = function() {
  // hints in Yukon are weird.  we look at the last card on each stack for targets, then go and find
  // cards which could be moved there. (this is because any faceUp card can be moved in Yukon)
  for(var i = 0; i < 7; i++) {
    var card = this.stacks[i].lastChild;
    if(card) {
      var source = this.findCardToPutOn(card);
      if(source) return {source:source, destinations:[card]};
    }
  }
  return null;
};
// take a card a find another card on a differnt stack of opposite colour and one less in rank
Yukon.findCardToPutOn = function(target) {
  for(var i = 0; i < 7; i++) {
    var stack = this.stacks[i];
    if(stack!=target.parentNode && stack.hasChildNodes()) {
      var card = stack.lastChild;
      while(card && card.faceUp()) {
        if(target.isConsecutiveTo(card) && target.notSameColour(card)) return card;
        card = card.previousSibling;
      }
    }
  }
  return null;
}



///////////////////////////////////////////////////////////
//// smart move
Yukon.smartMove = function(card) {
  if(!this.canMoveCard(card)) return false;
  var target = this.getBestMoveFor(card);
  if(target) this.moveTo(card,target);
};
// finds the first stack from the left where the card can be moved to
Yukon.getBestMoveFor = function(card) {
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

Yukon.canAutoplayCard = function(card) {
  return (card.isAce() || this.cardOnFoundations(card.suit(),card.number()-1));
};
Yukon.cardOnFoundations = function(suit, number) {
  for(var i = 0; i < 4; i++) {
    var stack = this.foundations[i];
    if(stack.hasChildNodes()) {
      var last = stack.lastChild;
      if(last.suit()==suit && last.number()>=number) return true;
    }
  }
  return false;
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
