var AcesUp = new CardGame(ACES_HIGH);

AcesUp.init = function() {
  this.shortname = "acesup";
  this.initStacks(4,1,0,true);
  //
  this.dragDropTargets = this.stacks.concat([this.foundation]);
};



///////////////////////////////////////////////////////////
//// start game
AcesUp.deal = function() {
  var cards = this.shuffleDecks(1);
  // If the four cards at the bottom of the stock are all different suits the
  // game is impossible. Check if this has happened and reshuffle if so
  while(this.allDifferentSuits(cards)) cards = this.shuffleDecks(1);
  // deal the cards
  for(var i = 0; i < 4; i++) this.dealToStack(cards,this.stacks[i],0,1);
  this.dealToStack(cards,this.stock,cards.length,0);
};
AcesUp.allDifferentSuits = function(cards) {
  // the cards which end up at the bottom of the stock are 44-48
  for(var i = 44; i < 48; i++)
    for(var j = 44; j < i; j++)
      if(cards[i].isSameSuit(cards[j])) return false;
  return true;
};



///////////////////////////////////////////////////////////
//// Moving
AcesUp.canMoveCard = function(card) {
  var p = card.parentNode;
  return (card.isLastOnPile() && p!=this.foundation && p!=this.stock);
};

AcesUp.canMoveToFoundation = function(card, stack) {
  for(var i = 0; i < 4; i++) {
    var stack = this.stacks[i];
    var top = stack.lastChild;
    if(stack!=card.parentNode && top && card.isSameSuit(top) && card.number()<top.number()) return true;
  }
  return false;
};
AcesUp.canMoveToPile = function(card, stack) {
  return !stack.hasChildNodes();
};



///////////////////////////////////////////////////////////
//// hint
// AcesUp may not ever get hints, because there isn't much point



///////////////////////////////////////////////////////////
//// smart move
AcesUp.smartMove = function(card) {
  if(!this.canMoveCard(card)) return false;
  if(this.canMoveToFoundation(card)) {
    this.moveTo(card,this.foundation);
  } else {
    var stack = this.getNextEmptyStack(card.parentNode);
    if(stack) this.moveTo(card,stack);
  }
};
AcesUp.getNextEmptyStack = function(stack) {
  var stacknum = parseInt(stack.id[stack.id.length-1]); // last char of id is the stack number
  for(var i = 0; i < 4; i++) {
    var next = this.stacks[(i+stacknum) % 4];
    if(next!=stack && !next.hasChildNodes()) return next;
  }
  return null;
};



///////////////////////////////////////////////////////////
//// Autoplay
// It wouldn't make any sense to have autoplay in AcesUp.  It would effectively play the game for you



///////////////////////////////////////////////////////////
//// winning, scoring, undo
AcesUp.hasBeenWon = function() {
  // game won if foundation has all cards except aces, which are on the stacks (and are high, hence ==14)
  if(this.foundation.childNodes.length!=48) return false;
  for(var i = 0; i < 4; i++) {
    var s = this.stacks[i];
    if(a.childNodes.length!=1 || !s.lastChild.isAce()) return false;
  }
  return true;
};

Games["AcesUp"] = AcesUp;
