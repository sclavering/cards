var Canfield = new CardGame(CAN_TURN_STOCK_OVER);

Canfield.init = function() {
  this.shortname = "canfield";
  this.initStacks(4,4,1,true,true);
  this.sourceStacks = [this.reserve,this.waste].concat(this.stacks);
  this.thingsToReveal = [this.reserve];
  this.dragDropTargets = this.stacks.concat(this.foundations);
};


///////////////////////////////////////////////////////////
//// start game
Canfield.deal = function() {
  var cards = this.shuffleDecks(1)
  this.dealToStack(cards,this.reserve,12,1);
  this.dealToStack(cards,this.foundations[0],0,1);
  this.foundationStartNumber = this.foundations[0].firstChild.number()
  for(var i = 0; i < 4; i++) this.dealToStack(cards,this.stacks[i],0,1);
  this.dealToStack(cards,this.stock,cards.length,0);
};



///////////////////////////////////////////////////////////
//// Moving
Canfield.canMoveToFoundation = function(card, stack) {
  // only the top card on a stack can be moved to foundations
  if(!card.isLastOnPile()) return false;
  // either the stack is empty and the card is whatever base number we are building foundations from,
  // or it is consecutive (wrapping round at 13) and of the same suit
  var last = stack.lastChild;
  return (last ? (card.isSameSuit(last) && card.isConsecutiveMod13To(last))
               : (card.number()==this.foundationStartNumber));
};
Canfield.canMoveToPile = function(card, stack) {
  // either the pile must be empty, or the top card must be consecutive (wrapping at king) and opposite colour
  var last = stack.lastChild;
  return (!last || (last.notSameColour(card) && last.isConsecutiveMod13To(card)));
};



///////////////////////////////////////////////////////////
//// hint
Canfield.getHint = function() {
  for(var i = 0; i < 6; i++) {
    var card = this.sourceStacks[i].lastChild;
    if(card) {// && this.canMoveCard(card)) {
      var hint = this.getHintForCard(card);
      if(hint && hint.destinations.length>0) return hint;
    }
  }
  return null;
};
Canfield.getHintForCard = function(card) {
  if(!this.canMoveCard(card)) return null;
  var targets = new Array();
  for(var i = 0; i < 4; i++) {
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
Canfield.smartMove = function(card) {
  if(!this.canMoveCard(card)) return false;
  var target = this.findBestMoveForCard(card);
  if(target) this.moveTo(card,target);
};
// picks the first stack from the left the card could go to, or failing that, the first suit-stack
Canfield.findBestMoveForCard = function(card) {
  // find moves to non empty stacks
  for(var i = 0; i < 4; i++) {
    var stack = this.stacks[i];
    if(stack==card.parentNode) continue; // unnecessary??
    if(stack.hasChildNodes() && this.canMoveToPile(card,stack)) return stack;
  }
  // find moves to empty stacks
  for(var i = 0; i < 4; i++) {
    var stack = this.stacks[i];
    if(stack==card.parentNode) continue;
    if(!stack.hasChildNodes() && this.canMoveToPile(card,stack)) return stack;
  }
  // find moves to foundations
  for(var i = 0; i < 4; i++) {
    var stack = this.foundations[i];
    if(stack==card.parentNode) continue;
    if(this.canMoveToFoundation(card,stack)) return stack;
  }
  return null;
};



///////////////////////////////////////////////////////////
//// Autoplay
Canfield.autoplayMove = function() {
  // automove cards to suit stacks
  for(var i = 0; i < this.sourceStacks.length; i++) {
    var last = this.sourceStacks[i].lastChild;
    if(last && this.canAutoSendCardToFoundations(last) && this.sendToFoundations(last))
      return true;
  }
  return false;
};
Canfield.canAutoSendCardToFoundations = function(card) {
  // can always move card of the same num as the one which was initially dealt to foundations
  if(card.number()==this.foundationStartNumber) return true;
  // can move any other card there as long as the two one less in number and of the same colour are already there
  var found = 0;
  for(var i = 0; i < 4; i++) {
    var top = this.foundations[i].lastChild;
    if(top && top.colour()!=card.colour()) {
      var num = card.number()-1;
      if(num<0) num+=13;
      if(top.isAtLeastCountingFrom(num,this.foundationStartNumber)) found++;
    }
  }
  return (found==2);
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
Canfield.hasBeenWon = function() {
  // game won if all 4 Foundations have 13 cards
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=13)
      return false;
  return true;
};
Canfield.getScoreForAction = function(action) {
  return (
    action=="move-to-foundation"   ?  10 :
    action=="move-from-waste"      ?   5 :
    action=="card-revealed"        ?   5 :
    action=="move-from-foundation" ? -15 :
    0);
};


Games["Canfield"] = Canfield;  