var SimpleSimon = new CardGame(HAS_DIFFICULTY_LEVELS);

SimpleSimon.init = function() {
  this.shortname = "simon";
  this.initStacks(10,4);
  this.dragDropTargets = this.stacks.concat(this.foundations);
};


///////////////////////////////////////////////////////////
//// start game
SimpleSimon.deal = function() {
  var cards =
    this.difficultyLevel=="easy"   ? this.shuffleSuits(4,0,0,0) :
    this.difficultyLevel=="medium" ? this.shuffleSuits(2,2,0,0) :
    this.shuffleDecks(1);
  this.dealToStack(cards,this.stacks[0],0,8);
  this.dealToStack(cards,this.stacks[1],0,8);
  for(var i = 2; i < 10; i++) this.dealToStack(cards,this.stacks[i],0,10-i);
};



///////////////////////////////////////////////////////////
//// Moving
SimpleSimon.canMoveCard = function(card) {
  // cards on foundations cannot be moved
  if(card.parentNode.isFoundation) return false;
  // card can be moved as long as it only has a descending sequence of cards of its suit on it
  return this.canMoveCard_DescendingInSuit(card);
};

SimpleSimon.canMoveToFoundation = function(card, stack) {
  // only a K->A run can be put on a foundation, and the foundation must be empty
  // canMoveCard() will ensure we have a run, so only need to check the ends
  return (card.isKing() && card.parentNode.lastChild.isAce() && !stack.hasChildNodes());
};
SimpleSimon.canMoveToPile = function(card, stack) {
  // either stack is empty, or last card is consecutive
  var last = stack.lastChild;
  return (!last || last.isConsecutiveTo(card));
};



///////////////////////////////////////////////////////////
//// hint
// getHint never suggests moving a card to an empty space (because it is pointless to do so, and keeps
// the code slightly simpler)
SimpleSimon.getHint = function() {
  for(var i = 0; i < 10; i++) {
    var hint = this.getHintForStack(this.stacks[i]);
    if(hint) return hint;
  }
  return null;
};
SimpleSimon.getHintForStack = function(stack) {
  if(!stack.hasChildNodes()) return null;
  var card = this.getLowestMoveableCard_Suit(stack);
  if(card==null || !this.canMoveCard(card)) return null;
  var targets = this.findMovesForCard(card);
  if(targets.length>0)
    return {source: card, destinations: targets};
  return null;
};
SimpleSimon.findMovesForCard = function(card) {
  var targets = new Array();
  for(var i = 0; i < 10; i++) {
    var stack = this.stacks[i];
    if(this.canMoveTo(card,stack) && stack.hasChildNodes()) targets.push(stack.lastChild);
  }
  return targets;
};



///////////////////////////////////////////////////////////
//// smartmove (moves cards clicked with middle button to best possible destination
SimpleSimon.smartMove = function(card) {
  if(!this.canMoveCard(card)) return false;
  var destination = this.findBestMoveForCard(card);
  if(destination) this.moveTo(card,destination);
};
SimpleSimon.findBestMoveForCard = function(card) {
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
SimpleSimon.autoplayMove = function() {
  for(var i = 0; i < 10; i++) {
    var stack = this.stacks[i];
    var length = stack.childNodes.length;
    if(length>=13) {
      var card = stack.childNodes[length-13];
      for(var i = 0; i < 4; i++) {
        if(this.canMoveCard(card) && this.canMoveToFoundation(card,this.foundations[i])) {
          this.moveTo(card, this.foundations[i]);
          return true;
        }
      }
    }
  }
  return false;
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
SimpleSimon.hasBeenWon = function() {
  // game won if all 4 Foundations have 13 cards
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=13)
      return false;
  return true;
};
SimpleSimon.getScoreForAction = function(action) {
  return (
    action=="move-to-foundation" ? 100 :
    action=="move-between-piles" ?  -1 :
    0);
};


Games["SimpleSimon"] = SimpleSimon;
