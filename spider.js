var Spider =
Games["spider"] = {
  __proto__: BaseCardGame,

  id: "spider",


  foundationsBox: null,   // <vbox> containing <stack>s
  completedSuits: 0,      // count of how many suits have been completed and removed

  init: function() {
    this.foundationsBox = document.getElementById("spider-foundations");
    this.dragDropTargets = this.stacks.concat([this.foundationsBox]);
  },


  // XXX hack. can probably remove once spider's foundations code is normalised
  sendToFoundations: function() {
    return false;
  }
}


///////////////////////////////////////////////////////////
//// start game
Spider.deal = function() {
  var cards;
  switch(this.difficultyLevel) {
    case 1: cards = this.shuffleSuits(8,0,0,0); break;
    case 2: cards = this.shuffleSuits(4,4,0,0); break;
    default: cards = this.shuffleSuits(2,2,2,2);
  }
  var i;
  for(i = 0; i < 4;  i++) this.dealToStack(cards,this.stacks[i],5,1);
  for(i = 4; i < 10; i++) this.dealToStack(cards,this.stacks[i],4,1);
  this.dealToStack(cards,this.stock,50,0);
};



///////////////////////////////////////////////////////////
//// Dealing
Spider.canDealFromStock = function() {
  // cannot deal when any of the 10 stacks are empty
  for(var i = 0; i < 10; i++) if(!this.stacks[i].hasChildNodes()) return false;
  return true;
};



///////////////////////////////////////////////////////////
//// Moving
Spider.canMoveCard = Spider.canMoveCard_DescendingInSuit;

Spider.canMoveTo = function(card, target) {
  if(target==this.foundationsBox) {
    // canMove() ensures we have a continuous sequence
    return (card.isKing()&&card.parentNode.lastChild.isAce());
  } else {
    // can move if stack is empty, or if the last card is face up and consecutive
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
  var target = this.getFirstEmptyFoundation();
  this.trackMove("suit-completed", card, card.getSource());
  card.moveTo(target);
  return true;
};
Spider.getFirstEmptyFoundation = function() {
  for(var i = 0; i < this.foundations.length; i++)
    if(!this.foundations[i].hasChildNodes()) return this.foundations[i];
  return null;
};



///////////////////////////////////////////////////////////
//// hint
// the array of hints does not include moves to empty spaces, because the player is expected to notice those
Spider.getHints = function() {
  for(var i = 0; i < 10; i++) {
    var card = this.getLowestMoveableCard_Suit(this.stacks[i]);
    if(!card) continue;
    for(var j = 0; j < 10; j++) {
      var stack = this.stacks[j];
      if(stack.hasChildNodes() && this.canMoveTo(card,stack))
        this.addHint(card,stack);
    }
  }
};



///////////////////////////////////////////////////////////
//// smartmove
Spider.getBestMoveForCard = function(card) {
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
  for(var i = 0; i < 8; i++)
    if(this.foundations[i].childNodes.length!=13) return false;
  return true;
};
Spider.scores = {
  "suit-completed"    : 100,
  "move-between-piles":  -1
};
