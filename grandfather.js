var Grandfather = new CardGame();

Grandfather.init = function() {
  this.shortname = "grandfather";
  this.initStacks(7,4);
  this.thingsToReveal = this.stacks;
  this.dragDropTargets = this.stacks.concat(this.foundations);
};



///////////////////////////////////////////////////////////
//// start game
Grandfather.deal = function() {
  var cards = this.shuffleDecks(1);
  this.dealToStack(cards,this.stacks[0],0,1);
  for(var i = 1; i < 7; i++) this.dealToStack(cards,this.stacks[i],i,5);
};



///////////////////////////////////////////////////////////
//// Moving
Grandfather.canMoveToPile = function(card, stack) {
  // stack must be empty (in kde version the card has to be a king, but that makes the game too hard)
  // or last card in stack same suit and consecutive to card,
  var last = stack.lastChild;
  return (!last || (last.isSameSuit(card) && last.isConsecutiveTo(card)));
};



///////////////////////////////////////////////////////////
//// Hints
Grandfather.getHints = function() {
  for(var i = 0; i < 7; i++) {
    this.getHintForCard(this.stacks[i].lastChild);
  }
};
// find card one greater in number and of the same suit
Grandfather.getHintForCard = function(card) {
  if(!card) return;
  for(var i = 0; i < 7; i++) {
    var stack = this.stacks[i];
    if(stack==card.parentNode) continue;
    var current = stack.lastChild;
    while(current && current.faceUp()) {
      if(card.isConsecutiveTo(current) && card.isSameSuit(current)) {
        this.addHint(current,card.parentNode);
        return; // only ever get one hint per card, so may as well stop
      }
      current = current.previousSibling;
    }
  }
};



///////////////////////////////////////////////////////////
//// smart move
Grandfather.smartMove = function(card) {
  if(!this.canMoveCard(card)) return;
  var target = this.getBestMoveFor(card);
  if(target) this.moveTo(card,target);
};
Grandfather.getBestMoveFor = function(card) {
  var i, stack;
  // find card of same suit and one greater in number on top of stacks
  for(i = 0; i < 7; i++) {
    stack = this.stacks[i];
    if(stack==card.parentNode) continue;
    var lc = stack.lastChild;
    if(lc && lc.isSameSuit(card) && lc.isConsecutiveTo(card)) return stack;
  }
  // find an empty stack
  for(i = 0; i < 7; i++) {
    stack = this.stacks[i];
    if(!stack.hasChildNodes()) return stack;
  }
  return null;
};



///////////////////////////////////////////////////////////
//// Autoplay
Grandfather.autoplayMove = function() {
  // automove cards to suit stacks
  for(var i = 0; i < this.stacks.length; i++) {
    var last = this.stacks[i].lastChild;
    if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
  }
  return false;
};

// *any* card can be automoved to the suit stacks
Grandfather.canAutoplayCard = function(card) {
  if(card.isAce()) return true;
  return this.cardOnFoundations(card.suit(),card.number()-1);
};
Grandfather.cardOnFoundations = function(suit, number) {
  for(var i = 0; i < 4; i++) {
    var stack = this.foundations[i];
    if(stack.hasChildNodes()) {
      var lc = stack.lastChild; // lc = last card
      if(lc.suit()==suit && lc.number()>=number) return true;
    }
  }
  return false;
};



///////////////////////////////////////////////////////////
//// winning, scoring, undo
Grandfather.hasBeenWon = function() {
  // game won if all 4 Foundations have 13 cards
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=13)
      return false;
  return true;
};
Grandfather.getScoreForAction = function(action) {
  return (
    action=="move-to-foundation"   ?  10 :
    action=="card-revealed"        ?   5 :
    action=="move-from-foundation" ? -15 :
    0);
};

Games["Grandfather"] = Grandfather;
