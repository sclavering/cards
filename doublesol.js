/* this is a rather weird variant of Double Klondike, where foundations
   are built: A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K in
   strict suits, and one set of aces is missing
   */

var DoubleSol = new CardGame(CAN_TURN_STOCK_OVER);

DoubleSol.init = function() {
  this.shortname = "doublesol";
  this.initStacks(10,4,0,true,true);
  this.sourceStacks = [this.waste].concat(this.stacks);
  this.thingsToReveal = this.stacks;
  this.dragDropTargets = this.stacks.concat(this.foundations);
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
DoubleSol.getHint = function() {
  var card = this.waste.lastChild;
  if(card) {
    var hint = this.getHintForCard(card);
    if(hint && hint.destinations.length>0) return hint;
  }
  for(var i = 0; i < 10; i++) {
    card = this.getLowestMoveableCard_AltColours(this.stacks[i])
    if(card) {
      var hint = this.getHintForCard(card);
      if(hint && hint.destinations.length>0) return hint;
    }
  }
  return null;
};
DoubleSol.getHintForCard = function(card) {
  if(!this.canMoveCard(card)) return null;
  var targets = new Array();
  for(var i = 0; i < 10; i++) {
    var stack = this.stacks[i];
    if(this.canMoveTo(card,stack)) targets.push(stack.lastChild);
  }
  for(var i = 0; i < 4; i++) {
    var stack = this.foundations[i];
    if(this.canMoveTo(card,stack)) targets.push(stack);
  }
  if(targets.length > 0)
    return {source: card, destinations: targets};
  return null;
};



///////////////////////////////////////////////////////////
//// smart move
DoubleSol.smartMove = function(card) {
  if(!this.canMoveCard(card)) return false;
  var target = this.findBestMoveForCard(card);
  if(target) this.moveTo(card,target);
};
DoubleSol.findBestMoveForCard = function(card) {
  if(card.parentNode==this.waste) {
    // hunt through tableau piles
    for(var i = 0; i < 10; i++)
      if(this.canMoveToPile(card,this.stacks[i])) return this.stacks[i];
  } else {
    // find move to surrounding pile
    var dest = this.searchAround(card,DoubleSol.canMoveToPile);
    if(dest) return dest;
  }
  // find move to foundation
  for(var i = 0; i < 4; i++) {
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
  var altcolour = (card.colour()==RED) ? BLACK : RED;
  if(this.cardsOnFoundations(altcolour,card.number()-1)) return true;
  return false;
};
// if there are two stacks containing a card with number()>=number and colour() == colour, they must be
// different suits and so both cards of specified number and colour are already on suit stacks
// (hence cards of opposite colour and 1 less in number can be autoplayed)
DoubleSol.cardsOnFoundations = function(colour, number) {
  var found = 0;
  for(var i = 0; i < 4; i++) {
    var top = this.foundations[i].lastChild;
    if(top && top.number()>=number && top.colour()==colour) found++;
  }
  return (found==2);
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
DoubleSol.hasBeenWon = function() {
  // game won if all 4 Foundations have 13 cards
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=13)
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