var Spider = new CardGame(HAS_DIFFICULTY_LEVELS);

Spider.foundationsBox = null; // <vbox> containing <stack>s
Spider.dealsLeftDisplay = null;
Spider.dealsLeft = null; // number of times that player can deal out a set of ten cards
Spider.completedSuits = null; // count of how many suits have been completed and removed


Spider.init = function() {
  this.shortname = "spider";
  this.initStacks(10,8,0,true);
  //
  this.foundationsBox = document.getElementById("spider-foundations");
  this.dealsLeftDisplay = document.getElementById("spider-deals-left");
  //
  this.thingsToReveal = this.stacks;
  this.dragDropTargets = this.stacks.concat([this.foundationsBox]);
};


// XXX hack. can probably remove once spider's foundations code is normalised
Spider.sendToFoundations = function() {
  return false;
};


///////////////////////////////////////////////////////////
//// start game
Spider.deal = function() {
  this.completedSuits = 0;
  this.dealsLeft = 5;
  this.updateDealsLeftDisplay();
  var cards;
  switch(this.difficultyLevel) {
    case "easy":   cards = this.shuffleSuits(8,0,0,0); break;
    case "medium": cards = this.shuffleSuits(4,4,0,0); break;
    case "hard":   cards = this.shuffleSuits(2,2,2,2); break;
  }
  for(var i = 0; i < 4;  i++) this.dealToStack(cards,this.stacks[i],5,1);
  for(var i = 4; i < 10; i++) this.dealToStack(cards,this.stacks[i],4,1);
  this.dealToStack(cards,this.stock,50,0);
};



///////////////////////////////////////////////////////////
//// Dealing
Spider.canDealSet = function() {
  if(this.dealsLeft==0) return false;
  // cannot deal when any of the 10 stacks are empty
  for(var i = 0; i < 10; i++)
    if(!this.stacks[i].hasChildNodes()) return false;
  return true;
};
Spider.dealFromStock = function() {
  if(this.canDealSet()) {
    for(var i = 0; i < 10; i++)
      this.dealCardTo(this.stacks[i]);
    this.dealsLeft--;
    this.updateDealsLeftDisplay();
    this.trackMove("dealt-from-stock", null, null);
  }
};
Spider.undealFromStock = function() {
  for(var i = 9; i >= 0; i--)
    this.undealCardFrom(this.stacks[i]);
  this.dealsLeft++;
  this.updateDealsLeftDisplay();
};
Spider.updateDealsLeftDisplay = function() {
  this.dealsLeftDisplay.value = this.dealsLeft;
};



///////////////////////////////////////////////////////////
//// Moving
Spider.canMoveCard = Spider.canMoveCard_DescendingInSuit;

Spider.canMoveTo = function(card, target) {
  if(target==this.foundationsBox) {
    // canMove() ensures we have a continuous sequence
    return (card.isKing()&&card.parentNode.lastChild.isAce());
  } else {
    // can move of stack is empty, or if the last card is face up and consecutive
    var last = target.lastChild;
    return (!last || (last.faceUp() && last.isConsecutiveTo(card)));
  }
};

Spider.moveTo = function(card, target) {
  if(target==this.foundationsBox) {
    this.removeCompleteSuit(card);
    return true;
  } else {
    var source = card.getSource();
    card.moveTo(target);
    this.trackMove("move-between-piles", card, source);
    return true;
  }
};
Spider.removeCompleteSuit = function(card) {
  var targetStack = this.foundations[this.completedSuits];
  this.completedSuits++;
  this.trackMove("suit-completed", card, card.getSource());
  card.moveTo(targetStack);
  return true;
};
Spider.unremoveCompleteSuit = function(card, source) {
  this.completedSuits--;
  card.transferTo(source);
};



///////////////////////////////////////////////////////////
//// hint
// getHint never suggests moving a card to an empty space (because it is pointless to do so, and keeps
// the code slightly simpler)
Spider.getHints = function() {
  var hints = []
  for(var i = 0; i < 10; i++) {
    var hint = this.getHintForStack(this.stacks[i]);
    if(hint) hints.push(hint);
  }
  return hints;
};
Spider.getHintForStack = function(stack) {
  if(!stack.hasChildNodes()) return null;
  var card = this.getLowestMoveableCard_Suit(stack);
  if(!card || !this.canMoveCard(card)) return null;
  var targets = this.findMovesForCard(card);
  if(targets.length>0)
    return {source: card, destinations: targets};
  return null;
};
Spider.getLowestMoveableCard = function(stack) {
  if(!stack.hasChildNodes()) return null;
  var card = stack.lastChild;
  var prv = card.previousSibling;
  while(prv && !prv.faceDown() && prv.isSameSuit(card) && prv.isConsecutiveTo(card)) {
    card = prv;
    prv = card.previousSibling;
  }
  return card;
};
Spider.findMovesForCard = function(card) {
  var targets = new Array();
  for(var i = 0; i < 10; i++) {
    var stack = this.stacks[i];
    if(this.canMoveTo(card,stack) && stack.hasChildNodes()) targets.push(stack.lastChild);
  }
  return targets;
};



///////////////////////////////////////////////////////////
//// smartmove (moves cards clicked with middle button to best possible destination
Spider.smartMove = function(card) {
  if(!this.canMoveCard(card)) return false;
  var destination = this.findBestMoveForCard(card);
  if(destination) this.moveTo(card,destination);
};
Spider.findBestMoveForCard = function(card) {
  // find move to next card up of same suit
  var dest = this.searchAround(card,this.lastIsConsecutiveAndSameSuit);
  if(dest) return dest;
  // find move to next card up of any suit
  dest = this.searchAround(card,this.lastIsConsecutive);
  if(dest) return dest;
  // find moves to empty space
  dest = this.searchAround(card,this.stackIsEmpty);
  if(dest) return dest;
  return null;
};



///////////////////////////////////////////////////////////
//// Autoplay
Spider.autoplayMove = function() {
  // remove completed suits
  for(var i = 0; i < 10; i++) {
    var stack = this.stacks[i];
    var length = stack.childNodes.length;
    if(length>=13) {
      var card = stack.childNodes[length-13];
      if(card.isKing() && this.canMoveCard(card) && this.canMoveTo(card,this.foundationsBox)) {
        this.moveTo(card,this.foundationsBox);
        return true;
      }
    }
  }
  return false;
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
Spider.hasBeenWon = function() {
  return (this.completedSuits==8);
};
Spider.getScoreForAction = function(action) {
  return (
    action=="suit-completed"     ? 100 :
    action=="move-between-piles" ?  -1 :
    0);
};
Spider.undoMove = function(undo) {
  switch(undo.action) {
    case "suit-completed":
      this.unremoveCompleteSuit(undo.card,undo.source); break;
    default:
      undo.card.transferTo(undo.source);
  }
}

Games["Spider"] = Spider;