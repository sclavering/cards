var Gypsy = new CardGame(HAS_DIFFICULTY_LEVELS);

Gypsy.init = function() {
  this.shortname = "gypsy";
  this.initStacks(8,8,0,true);
  this.thingsToReveal = this.stacks;
  this.dragDropTargets = this.stacks.concat(this.foundations);
};



///////////////////////////////////////////////////////////
//// start game
Gypsy.deal = function() {
  var cards = this.difficultyLevel=="hard" ? this.shuffleDecks(2) : this.shuffleSuits(4,4,0,0);
  for(var i = 0; i < 8; i++) this.dealToStack(cards,this.stacks[i],2,1);
  this.dealToStack(cards,this.stock,cards.length,0);
};



///////////////////////////////////////////////////////////
//// Moving
Gypsy.canMoveCard = Gypsy.canMoveCard_DescendingAltColours;

Gypsy.canMoveToPile = function(card, stack) {
  // stack must be empty or last card (lc) in stack opposite colour and consecutive to card,
  var lc = stack.lastChild;
  return (!lc || (lc.faceUp() && lc.notSameColour(card) && lc.isConsecutiveTo(card)));
};



///////////////////////////////////////////////////////////
//// hint
Gypsy.getHint = function() {
  for(var i = 0; i < 8; i++) {
    var card = this.getLowestMoveableCard_AltColours(this.stacks[i]);
    if(card) {
      var hint = this.getHintForCard(card);
      if(hint && hint.destinations.length>0) return hint;
    }
  }
  return null;
};
Gypsy.getHintForCard = function(card) {
  var targets = new Array();
  for(var i = 0; i < 8; i++) {
    var stack = this.stacks[i];
    if(stack.hasChildNodes() && this.canMoveTo(card,stack)) targets.push(stack.lastChild);
  }
  for(var i = 0; i < 8; i++) {
    var stack = this.foundations[i];
    if(this.canMoveTo(card,stack)) targets.push(stack);
  }
  if(targets.length > 0)
    return {source: card, destinations: targets};
  return null;
};



///////////////////////////////////////////////////////////
//// smart move
Gypsy.smartMove = function(card) {
  if(!this.canMoveCard(card)) return false;
  var target = this.findBestMoveForCard(card);
  if(target) this.moveTo(card,target);
};
// picks the first stack fromthe left the card could go to, or - failing that - the first suit-stack
Gypsy.findBestMoveForCard = function(card) {
  // find a move onto another nonempty stack
  var dest = this.searchAround(card,function(c,s) {
    return (s.hasChildNodes() && Gypsy.canMoveTo(c,s)); // stupid scoping thingy again!!
  });
  if(dest) return dest;
  // find a move to an empty stack
  dest = this.searchAround(card,function(c,s) {
    return (!s.hasChildNodes() && Gypsy.canMoveTo(c,s)); // stupid scoping thingy again!!
  });
  if(dest) return dest;
  // move to a foundation
  for(var i = 0; i < 8; i++) {
    var stack = this.foundations[i];
    if(stack==card.parentNode) continue;
    if(this.canMoveToFoundation(card,stack)) return stack;
  }
  return null;
};


///////////////////////////////////////////////////////////
//// Autoplay
Gypsy.autoplayMove = function() {
  // automove cards to suit stacks
  for(var i = 0; i < 8; i++) {
    var last = this.stacks[i].lastChild;
    if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
  }
  return false;
};
// card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
Gypsy.canAutoplayCard = function(card) {
  if(card.isAce()) return true;
  var altcolour = (card.colour()==RED) ? BLACK : RED;
  if(this.cardsOnFoundations(altcolour,card.number()-1)) return true;
  return false;
};
// if there are four stacks containing a card with number()>=number and colour() == colour, they must be
// different suits and so both cards of specified number and colour are already on suit stacks
// (hence cards of opposite colour and 1 less in number can be autoplayed)
Gypsy.cardsOnFoundations = function(colour, number) {
  var found = 0;
  for(var i = 0; i < 8; i++) {
    var last = this.foundations[i].lastChild;
    if(last && last.number()>=number && last.colour()==colour)
      found++;
  }
  return (found==4);
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
Gypsy.hasBeenWon = function() {
  // game won if all 4 Foundations have 13 cards
  for(var i = 0; i < 8; i++)
    if(this.foundations[i].childNodes.length!=13)
      return false;
  return true;
};
Gypsy.getScoreForAction = function(action) {
  return (
    action=="move-to-foundation"   ?  10 :
    action=="card-revealed"        ?   5 :
    action=="move-from-foundation" ? -15 :
    0);
};


Games["Gypsy"] = Gypsy;
