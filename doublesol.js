/* this is a rather weird variant of Double Klondike, where foundations
   are built: A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K in
   strict suits, and one set of aces is missing
   */

var DoubleSol = new CardGame(CAN_TURN_STOCK_OVER);

DoubleSol.shortname = "doublesol";

DoubleSol.init = function() {
  this.sourceStacks = [this.waste].concat(this.stacks);
};



///////////////////////////////////////////////////////////
//// start game
DoubleSol.deal = function() {
  // get two packs less one set of aces
  var cards = this.getCardDecks(2);
  cards.splice(78,1); cards.splice(52,1);
  cards.splice(26,1); cards.splice(0,1);
  cards = this.shuffle(cards);
  for(var i = 0; i < 10; i++) this.dealToStack(cards,this.stacks[i],i,1);
  this.dealToStack(cards,this.stock,cards.length,0);
};



///////////////////////////////////////////////////////////
//// Moving
DoubleSol.canMoveToPile = function(card, stack) {
  // last on stack must be opposite colour and consecutive to card, or stack empty and card is a king
  var last = stack.lastChild;
  return (last
    ? (last.faceUp() && last.notSameColour(card) && last.isConsecutiveTo(card))
    : card.isKing());
};
DoubleSol.canMoveToFoundation = function(card, stack) {
  if(!card.isLastOnPile()) return false;
  // foundations are built A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K
  var last = stack.lastChild;
  if(!last) return card.isAce();
  if(!card.isSameSuit(last)) return false;
  if(card.number()==last.number()) return true;
  return (
    (!last.previousSibling || last.previousSibling.number()==last.number())
    && card.isConsecutiveTo(last));
}



///////////////////////////////////////////////////////////
//// hint
DoubleSol.getHints = function() {
  this.getHintsForCard(this.waste.lastChild);
  for(var i = 0; i < 10; i++) {
    this.getHintsForCard(this.getLowestMoveableCard_AltColours(this.stacks[i]));
  }
};
DoubleSol.getHintsForCard = function(card) {
  if(!card) return;
  var i, stack;
  for(i = 0; i < 10; i++) {
    stack = this.stacks[i];
    if(this.canMoveTo(card,stack)) this.addHint(card,stack);
  }
  for(i = 0; i < 4; i++) {
    stack = this.foundations[i];
    if(this.canMoveTo(card,stack)) {
      this.addHint(card,stack);
      return; // don't hint more than one move to a foundation
    }
  }
};



///////////////////////////////////////////////////////////
//// smart move
DoubleSol.getBestMoveForCard = function(card) {
  var i;
  if(card.parentNode==this.waste) {
    // hunt through tableau piles
    for(i = 0; i < 10; i++)
      if(this.canMoveToPile(card,this.stacks[i])) return this.stacks[i];
  } else {
    // find move to surrounding pile
    var dest = this.searchAround(card,DoubleSol.canMoveToPile);
    if(dest) return dest;
  }
  // find move to foundation
  for(i = 0; i < 4; i++) {
    var stack = this.foundations[i];
    if(stack==card.parentNode) continue;
    if(this.canMoveToFoundation(card,stack)) return stack;
  }
  return null;
};



///////////////////////////////////////////////////////////
//// Autoplay
DoubleSol.autoplayMove = function() {
  // automove cards to suit stacks
  for(var i = 0; i < this.sourceStacks.length; i++) {
    var last = this.sourceStacks[i].lastChild;
    if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
  }
  return false;
};
// card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
DoubleSol.canAutoplayCard = function(card) {
  if(card.isAce() || card.number()==2) return true;
  return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 2);
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
DoubleSol.hasBeenWon = function() {
  // game won if all 4 Foundations have 25==13*2-1 cards
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=25)
      return false;
  return true;
};
DoubleSol.getScoreForAction = function(action) {
  return (
    action=="move-to-foundation"   ?   10 :
    action=="move-from-waste"      ?    5 :
    action=="card-revealed"        ?    5 :
    action=="move-from-foundation" ?  -15 :
    action=="stock-turned-over"    ? -100 :
    0);
};

Games["DoubleSol"] = DoubleSol;
