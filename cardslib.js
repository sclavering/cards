/** A lot of stuff that individual card games need to call is accessed from the <image/> element that
  * represent cards.  These have the following methods:
  *   isCard - always returns true
  *   isAce() - boolean, avoids confusion over whether aces are 1 or 14 (low or high)
  *   isKing()
  *   number() - returns the number of the card, should be in range 1 to 13 (1==Ace, 11==Jack etc)
  *            - if current Game has acesHigh==true, then A=14 (so > and < work as expected)
  *   suit() - returns one of SPADE or HEART or DIAMOND or CLUB
  *   colour() - returns the colour, should be RED or BLACK
  *   faceDown() - boolean indicating whether the card is facedown
  *   faceUp() - boolean
  *   setFaceUp() - change the card so that it is face up instantly
  *   setFaceDown() - change the card so that it is face down instantly
  *   turnFaceUp() - animates the turning over (up) of the card
  *   position() - correctly positions a card in the stack it is in (adjusts its top and left attributes)
  *   moveTo(target) - moves the card and all its nextSibling's to the specified target (a stack).  this is animated
  *   transferTo(target) - as moveTo() but not animated
  * The following are used so that the source of any move can be tracked for "undo". Games should probably
  * call card.getSource() at the start of there moveTo function and pass it to trackMove(...), the other
  * two functions are intended for use within this file only.
  *   getSource()
  *   setSource()
  *   clearSource()
  * the class attribute is set in setFaceUp() and setFaceDown() to give the correct appearance
  *
  *
  * Most other stuff is defined on the CardGame object in cardgame.js, from which individual games should
  * inherit.  That provides wrappers for most other things in this file, so that games won't need updating
  * if this file changes.
  */


// box is an element descended from XUL <box>, so it will have a boxObject property
function getTop(box) { return box.boxObject.y; }
function getLeft(box) { return box.boxObject.x; }
function getRight(box) { return box.boxObject.x + box.boxObject.width; }
function getBottom(box) { return box.boxObject.y + box.boxObject.height; }
function getWidth(box) { return box.boxObject.width; }
function getHeight(box) { return box.boxObject.height; }

// constants for colours and suits
const RED = 1;
const BLACK = 2;
const SPADE = 3;
const HEART = 4;
const DIAMOND = 5;
const CLUB = 6;
// these are used in setting the class attribute of cards.
const CLUBSTR = "club";
const SPADESTR = "spade";
const HEARTSTR = "heart";
const DIAMONDSTR = "diamond";



/** CardShuffler
  *
  * This object creates cards (<image/> elements) as well as handling shuffling. It is accessed via a
  * bunch of methods on the CardGame object, from which all games inherit.
  *
  * some random old documentation:
  *
  * shuffleSuits(numSpades, numHearts, numDiamonds, numClubs)
  *   numSuitName specifies how many complete sets of that suit to use (Ace->King of that suit)
  *      e.g. shuffleCardsOfSuits(1,1,0,0) uses half a pack of cards, only the spades and clubs
  *
  * shuffleCards(numOfPacks) {
  *   shuffles the specified number of full packs of cards. If called without a number 1 pack is used
  *
  * createCard(suit, number) - creates a facedown card of specified suit an number
  */
var CardShuffler = {
  shuffleDecks: function(num) {
    return this.shuffleSuits(num, num, num, num);
  },
  shuffleSuits: function(numSpades, numHearts, numDiamonds, numClubs) {
    return this.shuffle(this.getCardSuits(numSpades, numHearts, numDiamonds, numClubs));
  },
  shuffle: function(allcards) {
    var shuffledCards = [];
    while(allcards.length) {
      var cardnum = parseInt(Math.random() * allcards.length);
      if(cardnum == allcards.length) cardnum--;
      shuffledCards.push(allcards.splice(cardnum,1)[0]);
    }
    return shuffledCards;
  },

  getCardDecks: function(num) {
    return this.getCardSuits(num,num,num,num);
  },
  getCardSuits: function(numSpades, numHearts, numDiamonds, numClubs) {
    var i, allcards = [];
    for (i = 0; i < numSpades;   i++) this.addSuitSet(allcards, BLACK, SPADE, SPADESTR);
    for (i = 0; i < numHearts;   i++) this.addSuitSet(allcards, RED, HEART, HEARTSTR);
    for (i = 0; i < numDiamonds; i++) this.addSuitSet(allcards, RED, DIAMOND, DIAMONDSTR);
    for (i = 0; i < numClubs;    i++) this.addSuitSet(allcards, BLACK, CLUB, CLUBSTR);
    return allcards;
  },
  addSuitSet: function(cards, colour, suit, suitstr) {
    for (var i = 1; i <= 13; i++) cards.push(this.createCard(colour, suit, suitstr, i));
  },

  createCard: function(colour, suit, suitstr, number) {
    var c = document.createElement("image");
    // base query methods, number() returns 14 if Game.acesHigh==true
    c.number = function() { return (number==1 ? (Game.acesHigh ? 14 : 1) : number); };
    //c.trueNumber = function() { return number; }; // needed for isConsecMod13To, but for mo just using _num
    c.colour = function() { return colour; };
    c.suit   = function() { return suit; };
    c.faceUp   = function() { return !this._facedown;};
    c.faceDown = function() { return this._facedown; };
    c.isAce  = function() { return number==1;  };
    c.isKing = function() { return number==13; };
    c.isLastOnPile = function() { return !this.nextSibling; };
    // more queries (consecutive ones use number() to get 14 for Aces)
    c.isConsecutiveTo = function(card) { return (this.number()==card.number()+1); };
    c.notConsecutiveTo = function(card) { return (this.number()!=card.number()+1); };
    c.isSameSuit = function(card) { return this._suit==card._suit; };
    c.notSameSuit = function(card) { return this._suit!=card._suit; };
    c.isSameColour = function(card) { return this._colour==card._colour; };
    c.notSameColour = function(card) { return this._colour!=card._colour; };
    // advanced queries, used in games where stacks can wrap round (King,Ace,2)
    c.isConsecutiveMod13To = function(card) {
      // returns true if card is one less than this, or card is King and this is Ace
      // uses _number rather than number() to avoid the Ace=14 thingy
      return ((this._number==card._number+1) || (this._number-1==card._number%13));
    };
    c.isAtLeastCountingFrom = function(number, from_num) {
      var thisnum = this._number;
      if(thisnum<from_num) thisnum+=13;
      if(number<from_num) number+=13;
      return (thisnum>=number);
    };
    // simple card turning
    c.setFaceUp = function() {
      this._facedown = false;
      this.className = "card-"+suitstr+"-"+number;
    };
    c.setFaceDown = function() {
      this._facedown = true;
      this.className = "card-facedown";
    };
    // methods for setting/retrieving stack where card has come from.  parentNode cannot be used as that will
    // often refer to the stack being used to move the cards round in
    c.getSource = function() {return (this._source ? this._source : this.parentNode); };
    c.setSource = function(node) { this._source = node; };
    c.clearSource = function() { this._source = null; };
    // other methods
    c.turnFaceUp = function() { CardTurner.turnFaceUp(this); };
    c.position   = function() { CardPositioner.position(this); };
    c.moveTo     = function(targetStack) { CardMover.move(this,targetStack); };
    c.transferTo = function(targetStack) { CardMover.transfer(this,targetStack); };
    // initialise properties
    c.isCard = true;
    c._number = number; // needed for isConsecMod13, but no longer used in number()
    c._suit = suit; // used in the more complex queries.  may delete in future.
    c._colour = colour;
    c.setFaceDown();
    c.clearSource(); // copied from Neil's code. not entirely sure why
    return c;
  }
}






/** CardTurner
  *
  * Handles the animated turning-face-up of cards.
  * Do not call directly, just use somecard.turnFaceUp() instead
  *
  */
var CardTurner = {
  angle: null,    // the angle the card has reached in being turned
  oldWidth: null, // the original width of the card
  oldLeft:  null, // the initial integer value of the left attribute
  interval: null, // Interval triggering the animation of turniong the card over
  card: null, // ref to the card being turned

  turnFaceUp: function(card) {
    this.card = card;
    this.angle = 0;
    this.oldLeft = parseInt(card.left);
    this.oldWidth = getWidth(card);
    this.interval = setInterval("CardTurner.turnFaceUpStep()",50);
    Cards.disableUI();
  },
  turnFaceUpStep: function() {
    this.angle += Math.PI/6;
    var newHalfWidth = Math.abs(parseInt(Math.cos(this.angle) * this.oldWidth / 2));
    this.card.width = 2*newHalfWidth;
    this.card.left = this.oldLeft + (this.oldWidth / 2) - newHalfWidth;
    // if the turn has passed the 90� mark, turn it over
    if(this.card.faceDown() && this.angle>=Math.PI/2) this.card.setFaceUp();
    // if it has turned all the way over
    if(this.angle>=Math.PI) this.turnFaceUpFinished();
  },
  turnFaceUpFinished: function() {
    clearInterval(this.interval);
    this.card.left = this.oldLeft;
    this.card.width = this.oldWidth;
    // don't enable the UI till were done autoplaying
    if(!Game.autoplay()) Cards.enableUI();
  }
}







/** MouseHandler1
  *
  * handles the dragging of cards (not true drag drop) and mouse clicks
  *
  * start() - called from CardGame.start(), resets some vars
  * addEvents() - enables mouse clickes and drag-drop
  * removeEvents() - disables clicks + drag-drop
  *
  * on mousedown the card being clicked is noted, then when the mouse moves
  * Game.canMoveCard() is queried.  if it return true then the card noted
  * and all cards folowing it in its parent stack are moved to a new stack in
  * the drag layer, and mouse events are attached to move it with the mouse.
  *
  * when cards are dropped the position is compared to that of each <stack> in
  * the targets array to see which target the user is trying to drop the cards
  * on. Game.tryMoveTo() is then called (Game is always the object for the
  * current game)
  */
var MouseHandler1 = {
  dragLayer: null, // a stack containing the whole game area which card(s) are moved to while dragging
  nextCard: null, // set on mousedown, so that on mousemove a stack c can be created
  cards: null, // the stack of cards being dragged
  tx: 0, // tx and ty used in positioning for drag+drop
  ty: 0,
  dragInProgress: false,

  // this is toggled true when mouse first moves and forces clicks to be ignored.
  // it is toggled false again when a drag is finished
  mouseMoved: false,

  init: function(dragLayer) {
    this.dragLayer = dragLayer;
    this.cards = document.createElement("stack");
    this.cards.hidden = true;
    this.dragLayer.appendChild(this.cards);
    // have to position the <stack/> or it fills its parent, blocking all mouse clicks!
    this.cards.top = 0; this.cards.left = 0;
  },

  start: function() {
//    MouseHandler2.disable();
    //this.nextCard = null; // set on mousedown so that on mousemove cardStack can be created
    // might need to clear .nextCard and hide .card
    this.tx = 0;
    this.ty = 0;
    this.enable();
  },

  enable: function() {
    this.dragLayer.addEventListener("mousedown", this.mouseDownWrapper, false);
    this.dragLayer.addEventListener("mousemove", this.mouseMoveWrapper, false);
    this.dragLayer.addEventListener("mouseup",   this.mouseUpWrapper,   false);
    this.dragLayer.addEventListener("click", this.mouseClickedWrapper,  false);
  },
  disable: function() {
    this.dragLayer.removeEventListener("mousedown", this.mouseDownWrapper, false);
    this.dragLayer.removeEventListener("mousemove", this.mouseMoveWrapper, false);
    this.dragLayer.removeEventListener("mouseup",   this.mouseUpWrapper,   false);
    this.dragLayer.removeEventListener("click", this.mouseClickedWrapper,  false);
  },

  // wrappers so that the *this* keyword works correctly in handlers
  mouseDownWrapper: function(e){if(e.button==0)MouseHandler1.mouseDown(e);},
  mouseUpWrapper:   function(e){if(e.button==0)MouseHandler1.mouseUp(e);  },
  mouseMoveWrapper: function(e){if(e.button==0)MouseHandler1.mouseMove(e);},
  mouseClickedWrapper: function(e){if(!MouseHandler1.dragInProgress) MouseHandler1.mouseClicked(e);},

  mouseDown: function(e) {
    var t = e.target;
    if(t.isCard && Game.canMoveCard(t)) this.nextCard = t;
  },

  mouseMove: function(e) {
    if(this.dragInProgress) {
      this.cards.left = e.pageX - this.tx;
      this.cards.top = e.pageY - this.ty;
    } else if(this.nextCard) {
      var card = this.nextCard;
      // move the cards to the drag box (this.cards)
      this.cards.hidden = false;
      this.cards.className = card.parentNode.className;
      this.cards.left = getLeft(card) - getLeft(this.dragLayer);
      this.cards.top  = getTop(card) - getTop(this.dragLayer);
      card.setSource(card.parentNode); // property to retrieve original source of cards
      card.transferTo(this.cards);
      // other stuff
      this.dragInProgress = true;
      this.tx = e.pageX - this.cards.left;
      this.ty = e.pageY - this.cards.top;
      this.nextCard = null;
    }
  },

  mouseUp: function(e) {
    if(this.dragInProgress) {
      this.dropCards();
      this.cards.hidden = true;
      this.dragInProgress = false;
    }
    this.nextCard = null;
  },
  dropCards: function() {
    var card = this.cards.firstChild, source = card.getSource();
    // for each target, check if the cards were dropped on it (if cards overlaps it)
    var targets = Game.dragDropTargets;
    for(var i = 0; i < targets.length; i++) {
      if(targets[i]==source) continue; // don't try moving card to where it came from
      if(this.overlaps(this.cards,targets[i]))
        if(Game.attemptMove(card,targets[i])) return true;
    }
    // move cards back
    card.transferTo(source);
    Game.autoplay();
    return false;
  },
  // item is the thing overlapping, object the thing overlapped, l=left etc, l2=left of the overlapped item
  overlaps: function(item, object) {
    function ordered(x,y,z) { return (x<=y && y<=z); };
    var l = getLeft(item), r = getRight(item), t = getTop(item), b = getBottom(item);
    var l2 = getLeft(object), r2 = getRight(object), t2 = getTop(object), b2 = getBottom(object);
    return ((ordered(l2,l,r2)||ordered(l2,r,r2)) && (ordered(t2,t,b2)||ordered(t2,b,b2)));
  },

  // middle click calls smartMove(), left clicks reveal(), dealFromStock(),
  // or turnStockOver(). double left click calls sendToFoundations()
  mouseClicked: function(e) {
    var t = e.target;
    if(e.button==1) {
    if(e.target.isCard) Game.smartMove(e.target);
    // right click should be showCard() ?
    } else if(e.button==0) {
      if(t.isCard) {
        if(Game.stock && t.parentNode==Game.stock) Game.dealFromStock();
        else if(t.faceDown()) Game.revealCard(t);
        else if(e.detail==2 && Game.foundations) Game.sendToFoundations(t);
      } else {
         if(Game.stock && t==Game.stock) Game.dealFromStock();
      }
    }
  }
}




// === BEGIN FREECELL ADDITIONS ===



/** MouseHandler2
  *
  * This performs the same job as MouseHandler, except that it makes the procedure for moving
  * a card:
  *   click to select source,
  *   click on destination,
  * rather than drag+drop
  *
  * uses the new Highlighter class to highlight selected cards.
  */
var MouseHandler2 = {
  source: null,
  dragLayer: null,

  init: function(stack) { this.dragLayer = stack; },
  start: function() {
//    MouseHandler.disable();
    this.enable();
  },
  enable: function() { this.dragLayer.addEventListener("click",this.mouseClickedWrapper,false); },
  disable: function() { this.dragLayer.removeEventListener("click",this.mouseClickedWrapper,false); },

  mouseClickedWrapper: function(e) { MouseHandler2.mouseClicked(e); },

  mouseClicked: function(e) {
    var t = e.target;
    if(e.button==0) {
      if(e.detail==2) { // && Game.foundations) {  // don't need for FreeCell, but might do in future
        this.clearHighlight();
        // in a double click the first click will have highlighted the card, so the
        // second click's target is the highlight box
        if(t.className=="card-highlight") Game.sendToFoundations(this.source);
        this.source = null;
      } else {
        if(this.source) {
          this.clearHighlight();
          // we move to a pile, not to the card the user clicks on :)
          if(t.isCard) t = t.parentNode;
          // must check if target is a cell or foundation, to avoid trying
          // to move card into the highlight box or main display stack :(
          if(t.isPile || t.isCell || t.isFoundation)
            if(t != this.source.parentNode)
              Game.attemptMove(this.source,t);
          this.source = null;
        } else {
          if(t.isCard && Game.canMoveCard(t)) {
            this.source = t;//.parentNode.lastChild;
            this.highlight();
          }
        }
      }
    } else if(e.button==1) {
      if(this.source) {
        this.clearHighlight();
        this.source = null;
      }
      if(t.isCard) Game.smartMove(t);
    }
  },

  highlight: function() { Highlighter.highlight(this.source); },
  clearHighlight: function() { Highlighter.clearHighlight(); }
}

var Highlighter = {
  positioningLayer: null, // stack where box is to be created
  highlightBoxes: null, // a bunch of boxes that get positioned round cards to highlight them
  destinations: null, // where the hint should show the card moving to

  init: function(stack) {
    this.positioningLayer = stack;
    this.highlightBox = document.createElement("box");
    this.highlightBox.className = "card-highlight";
  },

  highlight: function(card) {
    // card may be a stack if hint suggests moving to an empty stack
    this.highlightBox.left = getLeft(card) - getLeft(this.positioningLayer);
    this.highlightBox.top  = getTop(card)  - getTop(this.positioningLayer);
    this.highlightBox.width = getWidth(card);
    var height = card.isCard ? getBottom(card.parentNode.lastChild)-getTop(card) : getHeight(card);
    this.highlightBox.height = height;
    this.positioningLayer.appendChild(this.highlightBox);
  },
  clearHighlight: function() {
    this.positioningLayer.removeChild(this.highlightBox);
  }
}
// === END FREECELL ADDITIONS ===









/** CardMover
  *
  * handles moving cards between stacks
  *
  * transfer(card, target) - instantly moves card and all cards on top of it in its stack to target and positions them
  *   call via card.transferTo(target) instead
  *
  * move(card,target) - animated move of card and all cards on top of it to target
  *   call via card.moveTo(target) instead
  *
  * init(dragLayer) - called by application onload handler, gives it a ref to the <stack> to move cards round in
  */
var CardMover = {
  cards: null, // object being moved by animatedMoveObject
  target: null, // where its going to
  interval: null, // ref to the window.setInterval triggering the animation
  dragLayer: null, // ref to a stack which covers the whole game area and can be used to move the cards round in
  targetTop: 0, // coords where the card should end up (incl offset into pile)
  targetLeft: 0,
  moveStack: null, // a <stack/> element that holds cards during moves. used to be created+destroyed as needed

  init: function(stack) {
    this.dragLayer = stack;
    this.cards = document.createElement("stack");
    this.cards.top = 0; this.cards.left = 0; // so it doesn't fill parent and block clicks
    this.cards.hidden = true;
    this.cards.id = "card-move-pile";
    this.dragLayer.appendChild(this.cards);
  },
  move: function(firstCard, target) {
    Cards.disableUI(); // disabling the UI as early as pos might help SimpleSimon bug
    // move firstCard and all card on top of it to the move stack
    this.cards.className = firstCard.parentNode.className; // so cards layed out as in originating stack
    this.cards.left = getLeft(firstCard) - getLeft(this.dragLayer);
    this.cards.top  = getTop(firstCard) - getTop(this.dragLayer); // fudge for margin
    firstCard.transferTo(this.cards);
    this.cards.hidden = false;
    // set up conditions for animation stuff
    this.target = target;
    this.targetTop = getTop(this.target) - getTop(this.dragLayer) + CardPositioner.getNextCardTop(this.target);
    this.targetLeft = getLeft(this.target) - getLeft(this.dragLayer); // just to be sure
    this.interval = setInterval("CardMover.step()",30);
    // angle stays constant now that parseFloat is being used on top and left attrs
    var xdistance = this.targetLeft - parseFloat(this.cards.left);
    var ydistance = this.targetTop  - parseFloat(this.cards.top);
    var angle = Math.atan2(ydistance,xdistance);
    this.xchange = Math.cos(angle) * 50;
    this.ychange = Math.sin(angle) * 50;
  },

  step: function() {
    // calculate how far the card has to move
    var xdistance = this.targetLeft - parseFloat(this.cards.left);
    var ydistance = this.targetTop  - parseFloat(this.cards.top);
    // caluclate angle, then use to calculate the x and y "speed"s (from a known overall speed)
    var xchange = this.absMin(this.xchange,xdistance)
    var ychange = this.absMin(this.ychange,ydistance)
    this.cards.left = parseFloat(this.cards.left) + xchange;
    this.cards.top = parseFloat(this.cards.top) + ychange;
    // if its reached the destination
    if(xchange==xdistance && ychange==ydistance) this.moveComplete();
  },
  // returns the numerically smaller of the two values (ignoring sign)
  absMin: function(num1, num2) {
    return (Math.abs(num1) < Math.abs(num2)) ? num1 : num2;
  },

  moveComplete: function() {
    clearInterval(this.interval);
    this.cards.firstChild.clearSource(); //??
    this.transfer(this.cards.firstChild, this.target);
    this.cards.hidden = true;
    // don't enable the UI till we're finished autoplaying
    if(!FreeCellMover.step() && !Game.autoplay())
      Cards.enableUI();
  },

  transfer: function(firstCard, target) {
    var card = firstCard;
    var source = card.getSource();
    if(!target.offset) target.offset = source.offset;
    var nextCard;
    while(card) {
      nextCard = card.nextSibling;
      card.parentNode.removeChild(card);
      target.appendChild(card);
      card.position();
      card = nextCard;
    }
    if(target.id) {
      CardPositioner.fixStack(target);
      if(source.id) CardPositioner.fixStack(source);
      firstCard.clearSource();
    }
  }
}






/** CardPositioner
  *
  * Different piles require cards to be positioned differently. The class attribute is used to decide:
  *
  * card-pile:  cards are just piled up one on top of the other (like the foundations and stock in Klondike)
  * card-fan-down:  cards are spread vertically with an offset between the top of consecutive cards
  *                 offset is smaller between faceDown cards.   (e.g. tableau piles in Klondike)
  *
  * position(card) - positions the card by looking at all its previousSibling's,
  *       call after moving a card to a new stack, but get via card.position()
  * getNextCardTop(stack) - works out the position for the next face up card in
  *       a stack so that move animations go to the right place
  * fixStack - repositions all the (face up) cards in a stack so that they fit in the available space
  *       called in CardMover.transfer, though this may change
  */
var CardPositioner = {
  faceDownOffset: SkinPrefs.offsetBetweenFaceDownCards, // num of pixels between tops of two facedown cards
  faceUpOffset: SkinPrefs.offsetBetweenFaceUpCards, // num of pixels between tops of two faceup cards

  position: function(card) {
    card.left = 0;
    if(card.parentNode.className=="card-fan-down" && card.previousSibling)
      card.top = card.previousSibling.top - 0 + (card.previousSibling.faceUp() ? (card.parentNode.offset || this.faceUpOffset) : this.faceDownOffset);
    else
      card.top = 0;
  },

  getNextCardTop: function(stack) {
    if(stack.className!="card-fan-down") return 0;
    if(!stack.hasChildNodes()) return 0;
    return stack.lastChild.top - 0 + (stack.lastChild.faceUp() ? (stack.offset || this.faceUpOffset) : this.faceDownOffset);
  },

  fixStack: function(stack) {
    var card; // for loops
    if(stack.className!="card-fan-down") return;
    if(!stack.hasChildNodes()) {
      stack.offset = 0;
      return;
    }
    var numFaceUp = 0;
    for(card = stack.lastChild; card && card.faceUp(); card = card.previousSibling) numFaceUp++;
    if(numFaceUp <= 1) {
      stack.offset = 0;
      return;
    }
    var space = window.innerHeight - getBottom(stack.firstChild) - stack.childNodes.length * this.faceDownOffset;
    var offset = this.faceDownOffset + parseInt(space / numFaceUp);
    if(offset > this.faceUpOffset) offset = this.faceUpOffset;
    var old = stack.offset || this.faceUpOffset;
    stack.offset = offset;
    if(offset == old) return;
    var top = (stack.childNodes.length - numFaceUp) * this.faceDownOffset;
    // card will still hold a pointer to th last face down card, or null
    card = card ? card.nextSibling : stack.firstChild
    while(card) {
      if(card.top != top) card.top = top;
      top += offset;
      card = card.nextSibling
    }
  }
}






/** HintHighlighter
  *
  * cards are highlighted by placing a coloured, translucent rectangle over them (or a coloured border round them)
  * This is used to indicate the card to be moved and the destination for hints
  * Hints are indicated by placing a translucent rectangle round the source, then the target
  *
  * showHint(from, to) - indicate a suggested move to the user. "from" is the card to move
  *   "to" is an array of stacks and/or other cards where the "from" card should be moved to
  *
  * init(stack) - called by the onload handler in main.js
  */
var HintHighlighter = {
  positioningLayer: null, // stack where box is to be created
  highlightBox: null, // a bunch of boxes that get positioned round cards to highlight them
  destination: null, // where the hint should show the card moving to

  init: function(stack) {
    this.positioningLayer = stack;
    var box = document.createElement("box");
    box.className = "card-highlight";
    box.hidden = true;
    // must position it or it will fill its parent, blocking click events
    box.top = 0;
    box.left = 0;
    this.positioningLayer.appendChild(box);
    this.highlightBox = box;
  },

  showHint: function(from, to) {
    Cards.disableUI();
    // for when hint destination is really a stack
    this.destination = to.hasChildNodes() ? to.lastChild : to;
    this.highlight(from);
    setTimeout("HintHighlighter.highlightDestination()",300);
  },
  highlight: function(card) {
    // hide it while we move it
    this.highlightBox.hidden = true;
    // card may be a stack if hint suggests moving to an empty stack
    var height = card.isCard ? getBottom(card.parentNode.lastChild)-getTop(card) : getHeight(card);
    this.highlightBox.height = height;
    this.highlightBox.width = getWidth(card);
    this.highlightBox.top  = getTop(card)  - getTop(this.positioningLayer);
    this.highlightBox.left = getLeft(card) - getLeft(this.positioningLayer);
    this.highlightBox.hidden = false;
  },
  highlightDestination: function() {
    this.highlight(this.destination);
    setTimeout("HintHighlighter.highlightComplete()",300);
  },
  highlightComplete: function() {
    this.highlightBox.hidden = true;
    Cards.enableUI();
  }
}







/** Cards
  *
  * this mainly handles the behaviour of the chrome, especially switching between different card games
  */
var Cards = {
  preferences : null,  // ref to xpcom object implementing nsIPrefBranch for the branch "games.cards"
  currentGame: null,   // string holding the name of the game currently being played

  // refs to various <command> elements so they can be disabled
  cmdUndo: null,
  cmdHint: null,
  cmdNewGame: null,
  cmdRestartGame: null,
  cmdSetDifficulty: null,
  // refs to toolbar elements so they can be disabled
  difficultyLevelMenu: null,
  gameSelector: null,

  gameDisplayStack: null, // ref to <stack> used for moving content around in and holding current game
  scoreDisplay: null,     // ref to label on toolbar where score displayed

  init: function() {
    // init the preferences thingy
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
    this.preferences = prefService.getBranch("games.cards.");
    // init chrome DOM refs
    this.cmdUndo = document.getElementById("cmd:undo");
    this.cmdNewGame = document.getElementById("cmd:newgame");
    this.cmdRestartGame = document.getElementById("cmd:restart");
    this.cmdHint = document.getElementById("cmd:hint");
    this.cmdSetDifficulty = document.getElementById("cmd:setdifficulty");
    this.scoreDisplay = document.getElementById("score-display");
    this.difficultyLevelMenu = document.getElementById("game-difficulty-menu");
    this.gameSelector = document.getElementById("game-type-menu");
    this.gameDisplayStack = document.getElementById("current-game-display");
    // init other objects in cardslib.js
    MouseHandler1.init(this.gameDisplayStack);    // handles drag-drop and mouse clicks
    CardMover.init(this.gameDisplayStack);       // contains all the card moving animation code
    HintHighlighter.init(this.gameDisplayStack); // shows hints by drawing boxes round source/destination
    // FREECELL additions
    MouseHandler2.init(this.gameDisplayStack);   // handles drag-drop and mouse clicks
    Highlighter.init(this.gameDisplayStack);     // used by MouseHandler2
    // retrieve current game, stored in prefCurrentGame attribute on <window> element
    var currentGamePref =
      (this.preferences.getPrefType("current-game") != 0)
      ? this.preferences.getCharPref("current-game")
      : "Klondike";
    this.playGame(currentGamePref);
  },

  // enable/disable the UI elements. this is done whenever any animation
  // is taking place, as problems ensue otherwise.
  enableUI: function() {
    this.cmdHint.removeAttribute("disabled");
    this.cmdNewGame.removeAttribute("disabled");
    this.cmdRestartGame.removeAttribute("disabled");
    if(Game.hasDifficultyLevels) this.difficultyLevelMenu.removeAttribute("disabled");
    this.gameSelector.removeAttribute("disabled");
    this.enableUndo();
    MouseHandler.enable(); // handles drag-drop of cards and mouse clicks
  },
  enablePartialUI: function() {
    this.cmdNewGame.removeAttribute("disabled");
    this.cmdRestartGame.removeAttribute("disabled");
    if(Game.hasDifficultyLevels) this.difficultyLevelMenu.removeAttribute("disabled");
    this.gameSelector.removeAttribute("disabled");
  },
  disableUI: function() {
    this.cmdHint.setAttribute("disabled","true");
    this.cmdNewGame.setAttribute("disabled","true");
    this.cmdRestartGame.setAttribute("disabled","true");
    this.difficultyLevelMenu.setAttribute("disabled","true");
    this.gameSelector.setAttribute("disabled","true");
    this.disableUndo();
    MouseHandler.disable();
  },

  // enable/disable undo must be seperate as they are called from CardGame.trackMove() or something like that
  disableUndo: function() {
    this.cmdUndo.setAttribute("disabled","true");
  },
  enableUndo: function() {
    if(Game.canUndo())
      this.cmdUndo.removeAttribute("disabled");
  },

  // need to be able to show/hide the difficulty level menu when a new game type is started
  // because not all gmes have multiple difficulty levels.
  enableDifficultyMenu: function() { this.difficultyLevelMenu.removeAttribute("disabled"); },
  disableDifficultyMenu: function() { this.difficultyLevelMenu.setAttribute("disabled","true"); },

  // called by CardGame.trackMove() I think.
  displayScore: function(score) { this.scoreDisplay.value = score; },

  // called from CardGame.autoplay(), which is a function called after all significant moves, so handles
  // checking whether the game has been won and taking appropriate action.
  // this could be replaced by a tacky fireworks animation, or by a bouncing cards type thing :)
  showGameWon: function() {
    // get a reference to the prompt service component.
    var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    var msg1 = document.documentElement.getAttribute("gameWonTitle");
    var msg2 = document.documentElement.getAttribute("gameWonMessage");
    if(prompt.confirm(window,msg1,msg2)) Game.newGame();
    else this.enablePartialUI();
  },

  // switches which game is currently being played
  playGame: function(strGameName) {
    // end old game
    if(this.currentGame) {
      Game.end();
      document.getElementById(this.currentGame).hidden = true;
    }
    // show new game
    this.currentGame = strGameName;
    document.getElementById(strGameName).hidden = false;
    // store current game pref and start the game
    this.preferences.setCharPref("current-game",strGameName);
    Game = Games[strGameName];
    Game.start();
    // set the window title
    window.title = document.getElementById(strGameName).getAttribute("name");
  },

  // config dialogue, currently disabled because i didn't much like it
  showOptionsDialog: function() {
    var d = Game.difficultyLevel;
    var num = d=="easy" ? 0 : d=="hard" ? 2 : 1;
    window.openDialog("options.xul","options","chrome",function(){Cards.closeOptionsDialog();},num);
  },
  closeOptionsDialog: function() {
    var level = window.dialogMessage;
    if(level!=Game.difficultyLevel) Game.setDifficultyLevel(level);
  }
}


// Game var is always the object for the current game, this was a placeholder to avoid js errors
var Game = null;
var Games = [];

var MouseHandler;


window.addEventListener("load", function() {
  Cards.init();
  // fix window title.  setting window.title at the end of Cards.playGame doesn't work the first time.
  // I think it's something to do with the window not being visible yet
  var title = document.getElementById(Cards.currentGame).getAttribute("name");
  document.documentElement.setAttribute("title",title);
}, false);
