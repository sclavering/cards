var Gypsy = new CardGame();

Gypsy.init = function() {
  this.shortname = "gypsy";
  this.initStacks(8,8,0,true);
  this.thingsToReveal = this.stacks;
  this.dragDropTargets = this.stacks.concat(this.foundations);
};



///////////////////////////////////////////////////////////
//// start game
Gypsy.deal = function() {
  // 1==easy, 2==hard
  var cards = this.difficultyLevel==2 ? this.shuffleDecks(2) : this.shuffleSuits(4,4,0,0);
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
// XXX should arrange for moves to empty stacks to *all* be listed after *all* other hints
// currently moves to an empty space are listed for each card straight after interesting moves for it
Gypsy.getHints = function() {
  for(var i = 0; i < 8; i++) {
    var card = this.getLowestMoveableCard_AltColours(this.stacks[i]);
    this.getHintsForCard(card);
  }
};
Gypsy.getHintsForCard = function(card) {
  if(!card) return;
  var i, stack;
  for(i = 0; i < 8; i++) {
    stack = this.stacks[i];
    if(stack.hasChildNodes() && this.canMoveTo(card,stack)) this.addHint(card,stack);
  }
  /*
  for(i = 0; i < 8; i++) {
    stack = this.foundations[i];
    if(!stack.hasChildNodes() && this.canMoveTo(card,stack)) this.addHint(card,stack);
  }
  */
};



///////////////////////////////////////////////////////////
//// smart move
Gypsy.smartMove = function(card) {
  if(!this.canMoveCard(card)) return;
  var target = this.findBestMoveForCard(card);
  if(target) this.moveTo(card,target);
};
// picks the first stack from the left the card could go to, or - failing that - the first suit-stack
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
  if(card.isAce() || card.number()==2) return true;
  return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 4);
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
