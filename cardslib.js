var gPrefs = null; // nsIPrefBranch for "games.cards."

var gGameStack = null;  // the <stack id="games"/>
var gGameStackTop = 0;  // ... and its coords
var gGameStackLeft = 0;

var Game = null;  // the current games
var Games = [];   // all the games, indexed by id
var MouseHandler; // nasty thing.

var gUIEnabled = true; // set by Cards.[en/dis]ableUI().  used to ignore mouse events



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
  *
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
var RED = 1, BLACK = 2, SPADE = 3, HEART = 4, DIAMOND = 5, CLUB = 6;
// these are used in setting the class attribute of cards.
var CLUBSTR = "club", SPADESTR = "spade", HEARTSTR = "heart", DIAMONDSTR = "diamond";



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

  // modifies argument and returns it as well (both are useful in some circumstances)
  shuffle: function(cards) {
    // shuffle several times, because Math.random() appears to be rather bad.
    for(var i = 0; i < 3; i++) {
      // invariant: cards[0..n) unshuffled, cards[n..N) shuffled
      var n = cards.length;
      while(n != 0) {
        // get num from range [0..n)
        var num = Math.random();
        while(num==1.0) num = Math.random();
        num = Math.floor(num * n);
        // swap
        n--;
        var temp = cards[n];
        cards[n] = cards[num];
        cards[num] = temp;
      }
    }

    return cards;
  },

  getCardDecks: function(num) {
    return this.getCardSuits(num,num,num,num);
  },
  getCardSuits: function(numSpades, numHearts, numDiamonds, numClubs) {
    var i, allcards = [];
    for(i = 0; i < numSpades;   i++) this.addSuitSet(allcards, BLACK, SPADE, SPADESTR);
    for(i = 0; i < numHearts;   i++) this.addSuitSet(allcards, RED, HEART, HEARTSTR);
    for(i = 0; i < numDiamonds; i++) this.addSuitSet(allcards, RED, DIAMOND, DIAMONDSTR);
    for(i = 0; i < numClubs;    i++) this.addSuitSet(allcards, BLACK, CLUB, CLUBSTR);
    return allcards;
  },
  addSuitSet: function(cards, colour, suit, suitstr) {
    for(var i = 1; i <= 13; i++) cards.push(this.createCard(colour, suit, suitstr, i));
  },

  createCard: function(colour, suit, suitstr, number) {
    var c = document.createElement("image");
    // base query methods, number() returns 14 if Game.acesHigh==true
    c.number = function() { return (number==1 ? (Game.acesHigh ? 14 : 1) : number); };
    //c.trueNumber = function() { return number; }; // needed for isConsecMod13To, but for mo just using _num
    c.colour = function() { return colour; };
    c.altcolour = function() { return (colour==RED ? BLACK : RED); };
    c.suit   = function() { return suit; };
    c.faceUp   = function() { return !this._facedown;};
    c.faceDown = function() { return this._facedown; };
    c.isAce  = function() { return number==1;  };
    c.isQueen = function() { return number==12;};
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
      this.className = "card "+suitstr+"-"+number;
    };
    c.setFaceDown = function() {
      this._facedown = true;
      this.className = "card facedown";
    };
    // hangover from when source was a property of the first card in the move/drag stacks
    // (rather than of the stacks themselves as is now the case)
    c.getSource = function() { return this.parentNode.source; };
    // other methods
    c.turnFaceUp = function() { CardTurner.turnFaceUp(this); };
    c.moveTo     = function(targetStack) { CardMover.move(this,targetStack); };
    c.transferTo = function(targetStack) { CardMover.transfer(this,targetStack); };
    // initialise properties
    c.isCard = true;
    c.isPile = false;
    c._number = number; // needed for isConsecMod13, but no longer used in number()
    c._suit = suit; // used in the more complex queries.  may delete in future.
    c._colour = colour;
    c.setFaceDown();
    return c;
  }
}




// give it a <stack> element or the id for one. adds some expando properties
// (tried doing this in XBL, but it was unbearably slow)
function createCardPile(id) {
  var elt = document.getElementById(id);
  if(!elt) return null;
  return _createCardPile(elt);
}
function _createCardPile(elt) {
  elt.isCard = false;
  elt.isPile = true;
  elt.isFoundation = false;
  elt.isCell = false;
  elt.isReserve = false;
  elt.isStock = false;
  elt.isWaste = false;
  elt.isNormalPile = false;

  elt.offset = 0;

  // for the animated move stack and the drag stack |source|
  // is set to the pile the cards originally came from.
  elt.source = elt;

  if(elt.className=="fan-down") {
    elt.getNextCardLeft = function() { return 0; };

    elt.getNextCardTop = function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild.top - 0 + (this.lastChild.faceUp() ? (this.offset || Cards.cardFaceUpOffset) : Cards.cardFaceDownOffset);
    };

    elt.positionCard = function(card) {
      var prev = card.previousSibling;
      if(prev)
        card.top = prev.top - 0 + (prev.faceUp() ? (this.offset || Cards.cardFaceUpOffset) : Cards.cardFaceDownOffset);
      else
        card.top = 0;
      card.left = 0;
    };

    elt.fixLayout = function() {
      if(!this.hasChildNodes()) {
        this.offset = 0;
        return;
      }
      var card;
      var numFaceUp = 0;
      for(card = this.lastChild; card && card.faceUp(); card = card.previousSibling) numFaceUp++;
      if(numFaceUp <= 1) {
        this.offset = 0;
        return;
      }
      // card will still hold a pointer to the last face down card, or null.
      card = card ? card.nextSibling : this.firstChild
      var space = window.innerHeight - getBottom(card);
      var offset = Math.min(Math.floor(space / numFaceUp), Cards.cardFaceUpOffset);
      var old = this.offset || Cards.cardFaceUpOffset;
      this.offset = offset;
      if(offset == old) return;
      var top = (this.childNodes.length - numFaceUp) * Cards.cardFaceDownOffset;
      while(card) {
        if(card.top != top) card.top = top;
        top += offset;
        card = card.nextSibling;
      }
    };

  } else if(elt.className=="slide") {
    elt.getNextCardLeft = function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild.left - 0 + ((this.childNodes.length < 6) ? Cards.cardSlideOffset : 0);
    };

    elt.getNextCardTop = function() {
      if(!this.hasChildNodes()) return 0;
      if(this.childNodes.length < 6)
        return this.lastChild.top - 0 + Cards.cardSlideOffset;
      return this.lastChild.top;
    };

    elt.positionCard =  function(card) {
      var prev = card.previousSibling;
      if(!prev) {
        card.top = 0;
        card.left = 0;
        return;
      }
      card.top = prev.top;
      card.left = prev.left;
      if(this.childNodes.length < 6) {
        card.top = card.top - 0 + Cards.cardSlideOffset;
        card.left = card.left - 0 + Cards.cardSlideOffset;
      }
    };

    elt.fixLayout = function() {
      if(!this.hasChildNodes() ) {
        this.offset = 0;
        return;
      }
      if(this.childNodes.length==1 ) {
        this.offset = 0;
        this.firstChild.top = 0;
        this.firstChild.left = 0;
        return;
      }
      var card;
      // figure out how many we can shift in space allotted
      var maxYShifts = parseInt((window.innerHeight - getBottom(this.firstChild))/Cards.cardSlideOffset);
      var maxXShifts = parseInt((window.innerWidth - getRight(this.firstChild))/Cards.cardSlideOffset);
      var offX = 0;
      var offY = 0;
      if(maxYShifts > 5) maxYShifts = 5;
      if(maxXShifts > 5) maxXShifts = 5;
      var count = this.childNodes.length;
      card = this.firstChild;
      while(card) {
        card.top = offY;
        card.left = offX;
        if(count <= maxYShifts) offY += Cards.cardSlideOffset;
        if(count <= maxXShifts) offX += Cards.cardSlideOffset;
        card = card.nextSibling;
        count--;
      }
    };

  } else if(elt.className=="fan-right") {
    elt.getNextCardLeft = function() {
      var last = this.lastChild;
      if(!last) return 0;
      return last.left - 0 + (last.faceUp() ? Cards.cardFaceUpHOffset : Cards.cardFaceDownHOffset);
    };

    elt.getNextCardTop = function() { return 0; };

    elt.positionCard = function(card) {
      var prev = card.previousSibling;
      if(prev)
        card.left = prev.left - 0 + (prev.faceUp() ? Cards.cardFaceUpHOffset : Cards.cardFaceDownHOffset);
      else
        card.left = 0;
      card.top = 0;
    };

    elt.fixLayout = function(stack) { this.offset = 0; };

  } else {
    elt.getNextCardLeft = function() { return 0; };
    elt.getNextCardTop = function() { return 0; };
    elt.positionCard = function(card) {
      card.top = 0;
      card.left = 0;
    };
    elt.fixLayout = function(stack) {
      // xxx: could reposition all cards to (0,0) here just to be sure?
      this.offset = 0;
    };
  }

  elt.addCard = function(card) {
    this.appendChild(card);
    this.positionCard(card);
  };

  // transfers the card and all those that follow it
  // xxx: not in use yet
  elt.transferCards = function(first) {
    var next, card = first;
    while(card) {
      next = card.nextSibling;
      card.parentNode.removeChild(card);
      this.appendChild(card);
      card = next;
    }
    this.fixLayout();
  };

  return elt;
}


// for the CardMover, MouseHandler1, etc
function createFloatingPile(className) {
  var pile = document.createElement("stack");
  pile.className = className;
  _createCardPile(pile);
  // putting the pile where it's not visible is faster than setting it's |hidden| property
  pile.hide = function() {
    this.top = -1000;
    this.left = -1000;
  };
  gGameStack.appendChild(pile);
  pile.hide();
  return pile;
}









/** CardTurner
  *
  * Handles the animated turning-face-up of cards.
  * Do not call directly, just use somecard.turnFaceUp() instead
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
    this.interval = setInterval(function(){CardTurner.turnFaceUpStep();}, 50);
    Cards.disableUI();
  },
  turnFaceUpStep: function() {
    this.angle += Math.PI/6;
    var newHalfWidth = Math.floor(Math.abs(Math.cos(this.angle) * this.oldWidth / 2));
    this.card.width = 2 * newHalfWidth;
    this.card.left = this.oldLeft + (this.oldWidth / 2) - newHalfWidth;
    // if the turn has passed the 90° mark, turn it over
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
  nextCard: null, // set on mousedown, so that on mousemove a stack c can be created
  cards: null, // the stack of cards being dragged
  tx: 0, // tx and ty used in positioning for drag+drop
  ty: 0,
  dragInProgress: false,

  // this is toggled true when mouse first moves and forces clicks to be ignored.
  // it is toggled false again when a drag is finished
  mouseMoved: false,

  init: function() {
    // class doesn't need to be flexible for the moment
    this.cards = createFloatingPile("fan-down");
  },

  start: function() {
    this.nextCard = null;
    this.tx = 0;
    this.ty = 0;
  },

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
//      this.cards.className = card.parentNode.className;
      this.cards.left = getLeft(card) - gGameStackLeft;
      this.cards.top = getTop(card) - gGameStackTop;
      // property to retrieve original source of cards. for most
      // piles |source| is a pointer back to the pile itself.
      this.cards.source = card.parentNode.source;
      card.transferTo(this.cards);
      // other stuff
      this.dragInProgress = true;
      this.tx = e.pageX - this.cards.left;
      this.ty = e.pageY - this.cards.top;
      this.nextCard = null;
    }
  },

  mouseUp: function(e) {
    this.nextCard = null;
    if(!this.dragInProgress) return;
    this.dragInProgress = false;

    var l = getLeft(this.cards), r = getRight(this.cards), t = getTop(this.cards), b = getBottom(this.cards);

    var card = this.cards.firstChild;
    var source = card.parentNode.source;
    // try dropping cards on each possible target
    var targets = Game.dragDropTargets;
    var success = false;
    for(var i = 0; !success && i<targets.length; i++) {
      var target = targets[i];
      if(target==source) continue;

      var l2 = getLeft(target), r2 = getRight(target), t2 = getTop(target), b2 = getBottom(target);
      var overlaps = (((l2<=l && l<=r2)||(l2<=r && r<=r2)) && ((t2<=t && t<=b2)||(t2<=b && b<=b2)));
      if(overlaps && Game.attemptMove(card,target)) success = true;
    }
    // move cards back
    if(!success) card.transferTo(source);

    this.cards.hide();
  },

  // middle click calls smartMove(), left clicks reveal(), dealFromStock(),
  // or turnStockOver(). double left click calls sendToFoundations()
  mouseClick: function(e) {
    if(this.dragInProgress) return;

    var t = e.target;
    if(e.button==1) {
      if(t.isCard) Game.smartMove(t);
    // right click should be showCard() ?
    } else if(e.button==0) {
      if(t.isCard) {
        if(t.parentNode.isStock) Game.dealFromStock();
        else if(t.faceDown()) Game.revealCard(t);
        else if(e.detail==2 && Game.foundations) Game.sendToFoundations(t);
      } else {
        if(t.isStock) Game.dealFromStock();
      }
    }
  }
}





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

  start: function() {},

  mouseUp: function(e) {},
  mouseDown: function(e) {},
  mouseMove: function(e) {},

  mouseClick: function(e) {
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
          if((t.isCard && t.parentNode.isStock) || (t.isPile && t.isStock)) {
            Game.dealFromStock();
          } else if(t.isCard && Game.canMoveCard(t)) {
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
  highlightBox: null, // a boxes that get positioned round cards to highlight them
  destinations: null, // where the hint should show the card moving to

  init: function(stack) {
    this.highlightBox = document.createElement("box");
    this.highlightBox.className = "card-highlight";
  },

  highlight: function(card) {
    // card may be a stack if hint suggests moving to an empty stack
    this.highlightBox.left = getLeft(card) - gGameStackLeft;
    this.highlightBox.top = getTop(card) - gGameStackTop;
    this.highlightBox.width = getWidth(card);
    var height = card.isCard ? getBottom(card.parentNode.lastChild)-getTop(card) : getHeight(card);
    this.highlightBox.height = height;
    gGameStack.appendChild(this.highlightBox);
  },
  clearHighlight: function() {
    gGameStack.removeChild(this.highlightBox);
  }
}





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
  * init() - called by application onload handler,
  */
var CardMover = {
  cards: null, // object being moved by animatedMoveObject
  target: null, // where its going to
  interval: null, // ref to the window.setInterval triggering the animation
  targetTop: 0, // coords where the card should end up (incl offset into pile)
  targetLeft: 0,
  moveStack: null, // a <stack/> element that holds cards during moves. used to be created+destroyed as needed

  init: function() {
    // class doesn't need to be flexible yet
    this.cards = createFloatingPile("fan-down");
    this.cards.id = "card-move-pile";
  },
  move: function(firstCard, target) {
    Cards.disableUI();
    // move firstCard and all card on top of it to the move stack
//    this.cards.className = firstCard.parentNode.className; // so cards layed out as in originating stack
    this.cards.left = getLeft(firstCard) - gGameStackLeft;
    this.cards.top = getTop(firstCard) - gGameStackTop
    firstCard.transferTo(this.cards);
    // set up conditions for animation stuff
    this.target = target;
    this.targetLeft = getLeft(this.target) - gGameStackLeft + this.target.getNextCardLeft();
    this.targetTop = getTop(this.target) - gGameStackTop + this.target.getNextCardTop();
    this.interval = setInterval(function(){CardMover.step();}, 30);
    // angle stays constant now that parseFloat is being used on top and left attrs
    var xdistance = this.targetLeft - parseFloat(this.cards.left);
    var ydistance = this.targetTop  - parseFloat(this.cards.top);
    var angle = Math.atan2(ydistance,xdistance);
    this.xchange = Math.cos(angle) * 50;
    this.ychange = Math.sin(angle) * 50;
  },

  step: function() {
    // returns the numerically smaller of the two values (ignoring sign)
    function absMin(num1, num2) { return (Math.abs(num1) < Math.abs(num2)) ? num1 : num2; }
    // calculate how far the card has to move
    var xdistance = this.targetLeft - parseFloat(this.cards.left);
    var ydistance = this.targetTop  - parseFloat(this.cards.top);
    // caluclate angle, then use to calculate the x and y "speed"s (from a known overall speed)
    var xchange = absMin(this.xchange,xdistance)
    var ychange = absMin(this.ychange,ydistance)
    this.cards.left = parseFloat(this.cards.left) + xchange;
    this.cards.top = parseFloat(this.cards.top) + ychange;
    // if its reached the destination
    if(xchange==xdistance && ychange==ydistance) this.moveComplete();
  },

  moveComplete: function() {
    clearInterval(this.interval);
    this.transfer(this.cards.firstChild, this.target);
    this.cards.hide();
    // don't enable the UI till we're finished autoplaying
    if(!FreeCellMover.step() && !Game.autoplay())
      Cards.enableUI();
  },

  transfer: function(firstCard, target) {
    var card = firstCard;
    var source = card.parentNode.source;
    if(!target.offset) target.offset = source.offset;
    var nextCard;
    while(card) {
      nextCard = card.nextSibling;
      card.parentNode.removeChild(card);
      target.addCard(card);
      card = nextCard;
    }
    if(target.id) {
      target.fixLayout();
      if(source.id) source.fixLayout();
    }
  }
}






/** HintHighlighter
  *
  * This is used to indicate the card to be moved and the destination for hints
  * Hints are indicated by placing a translucent rectangle round the source, then the target
  *
  * showHint(from, to) - indicate a suggested move to the user. "from" is the card to move
  *   "to" is an array of stacks and/or other cards where the "from" card should be moved to
  */
var HintHighlighter = {
  highlightBox: null, // a bunch of boxes that get positioned round cards to highlight them
  destination: null, // where the hint should show the card moving to

  init: function(stack) {
    var box = document.createElement("box");
    box.className = "card-highlight";
    box.hidden = true;
    // must position it or it will fill its parent, blocking click events
    box.top = 0;
    box.left = 0;
    gGameStack.appendChild(box);
    this.highlightBox = box;
  },

  showHint: function(from, to) {
    Cards.disableUI();
    // for when hint destination is really a stack
    this.destination = to.hasChildNodes() ? to.lastChild : to;
    this.highlight(from);
    setTimeout(function(){HintHighlighter.highlightDestination();}, 300);
  },
  highlight: function(card) {
    // hide it while we move it
    this.highlightBox.hidden = true;
    // card may be a stack if hint suggests moving to an empty stack
    var height = card.isCard ? getBottom(card.parentNode.lastChild)-getTop(card) : getHeight(card);
    this.highlightBox.height = height;
    this.highlightBox.width = getWidth(card);
    this.highlightBox.left = getLeft(card) - gGameStackLeft;
    this.highlightBox.top = getTop(card) - gGameStackTop;
    this.highlightBox.hidden = false;
  },
  highlightDestination: function() {
    this.highlight(this.destination);
    setTimeout(function(){HintHighlighter.highlightComplete();}, 300);
  },
  highlightComplete: function() {
    this.highlightBox.hidden = true;
    Cards.enableUI();
  }
}




/* used to ensure that |this| refers to the right thing within the real event handler,
   and so that we can avoid adding and removing the event listeners while animating */
function handleMouseClick(e) {
  if(!gUIEnabled) return;
  MouseHandler.mouseClick(e);
}
function handleMouseUp(e) {
  if(!gUIEnabled || e.button!=0) return;
  MouseHandler.mouseUp(e);
}
function handleMouseDown(e) {
  if(!gUIEnabled || e.button!=0) return;
  MouseHandler.mouseDown(e);
}
function handleMouseMove(e) {
  if(!gUIEnabled) return;
  MouseHandler.mouseMove(e);
}




/** Cards
  *
  * this mainly handles the behaviour of the chrome, especially switching between different card games
  */
var Cards = {
  cardFaceDownOffset: 5, // num of pixels between tops of two facedown cards
  cardFaceUpOffset: 22, // num of pixels between tops of two faceup cards
  cardSlideOffset: 2, // num of pixels between edges of two slid cards
  cardFaceDownHOffset: 5, // num pixels between *left* edges of two face down cards
  cardFaceUpHOffset: 10, // num pixels between *left* edges of two face up cards

  // refs to various <command> elements so they can be disabled
  cmdUndo: null,
  cmdHint: null,
  cmdNewGame: null,
  cmdRestartGame: null,
  cmdRedeal: null,
  cmdSetDifficulty: null,
  // refs to toolbar elements so they can be disabled
  difficultyLevelMenu: null,
  difficultyLevelPopup: null, // the <menupopup> for difficultyLevelMenu
  gameSelector: null,

  scoreDisplay: null,     // ref to label on toolbar where score displayed

  init: function() {
    // init chrome DOM refs
    this.cmdUndo = document.getElementById("cmd:undo");
    this.cmdNewGame = document.getElementById("cmd:newgame");
    this.cmdRestartGame = document.getElementById("cmd:restart");
    this.cmdHint = document.getElementById("cmd:hint");
    this.cmdRedeal = document.getElementById("cmd:redeal");
    this.cmdSetDifficulty = document.getElementById("cmd:setdifficulty");
    this.scoreDisplay = document.getElementById("score-display");
    this.difficultyLevelMenu = document.getElementById("game-difficulty-menu");
    this.difficultyLevelPopup = document.getElementById("game-difficulty-popup");
    this.gameSelector = document.getElementById("game-type-menu");

    gGameStack = document.getElementById("games");
    gGameStackTop = gGameStack.boxObject.y;
    gGameStackLeft = gGameStack.boxObject.x;

    // mouse event listeners
    gGameStack.addEventListener("click", handleMouseClick, false);
    gGameStack.addEventListener("mousemove", handleMouseMove, false);
    gGameStack.addEventListener("mousedown", handleMouseDown, false);
    gGameStack.addEventListener("mouseup", handleMouseUp, false);

    // init other objects in cardslib.js
    MouseHandler1.init();
    CardMover.init();
    HintHighlighter.init();
    Highlighter.init();

    // build the games menu
    var menu = document.getElementById("menupopup-gametypes");
    for(var game in Games) {
      var el = document.getElementById(game);
      var mi = document.createElement("menuitem");
      mi.setAttribute("label",el.getAttribute("name"));
      mi.setAttribute("accesskey",el.getAttribute("menukey"));
      mi.value = game;
      menu.appendChild(mi);
    }

    // switch to last played game
    game = "Klondike";
    try {
      game = gPrefs.getCharPref("current-game");
    } catch(e) {}
    if(!(game in Games)) game = "Klondike"; // just in case pref gets corrupted
    Game = Games[game];
    Game.start();
    // set window title. (setting window.title does not work as the app. is starting)
    var title = document.getElementById(game).getAttribute("name");
    document.documentElement.setAttribute("title",title);
  },

  // switches which game is currently being played
  playGame: function(game) {
    // end old game
    if(Game) Game.end();
    // store current game pref and start the game
    gPrefs.setCharPref("current-game",game);
    Game = Games[game];
    Game.start();
    // set the window title
    window.title = document.getElementById(game).getAttribute("name");
  },

  // enable/disable the UI elements. this is done whenever any animation
  // is taking place, as problems ensue otherwise.
  enableUI: function() {
    gUIEnabled = true;
    this.cmdHint.removeAttribute("disabled");
    this.cmdNewGame.removeAttribute("disabled");
    this.cmdRestartGame.removeAttribute("disabled");
    this.enableDifficultyMenu();
    this.gameSelector.removeAttribute("disabled");
    this.enableUndo();
    this.enableRedeal();
  },
  enablePartialUI: function() {
    this.cmdNewGame.removeAttribute("disabled");
    this.cmdRestartGame.removeAttribute("disabled");
    this.enableDifficultyMenu();
    this.gameSelector.removeAttribute("disabled");
  },
  disableUI: function() {
    gUIEnabled = false;
    this.cmdHint.setAttribute("disabled","true");
    this.cmdNewGame.setAttribute("disabled","true");
    this.cmdRestartGame.setAttribute("disabled","true");
    this.difficultyLevelMenu.setAttribute("disabled","true");
    this.gameSelector.setAttribute("disabled","true");
    this.cmdUndo.setAttribute("disabled","true");
    this.cmdRedeal.setAttribute("disabled","true");
  },
  // en/dis-able the Undo and Redeal commands as required
  // don't use this too much because it's slow (it always adjusts attributes)
  fixUI: function() {
    if(Game.canUndo()) this.cmdUndo.removeAttribute("disabled");
    else this.cmdUndo.setAttribute("disabled","true");
    if(Game.canRedeal()) this.cmdRedeal.removeAttribute("disabled");
    else this.cmdRedeal.setAttribute("disabled","true");
  },

  // called from CardGame.trackMove()/trackRedeal() as well as above
  enableUndo: function() {
    if(Game.canUndo()) this.cmdUndo.removeAttribute("disabled");
  },
  doEnableUndo: function() {
    this.cmdUndo.removeAttribute("disabled");
  },
  disableUndo: function() {
    this.cmdUndo.setAttribute("disabled","true");
  },
  enableRedeal: function() {
    if(Game.canRedeal()) this.cmdRedeal.removeAttribute("disabled");
  },
  disableRedeal: function() {
    this.cmdRedeal.setAttribute("disabled","true");
  },

  enableDifficultyMenu: function() {
    // the popup for the menu is built when the game is started
    // and will be empty if difficulty levels are not supported
    if(this.difficultyLevelPopup.hasChildNodes())
      this.difficultyLevelMenu.removeAttribute("disabled");
  },
  disableDifficultyMenu: function() {
    this.difficultyLevelMenu.setAttribute("disabled","true");
  },

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
  }
}





function useCardSet(set) {
  // XXX: Ideally the disabling of stylesheets would be based on their titles, but
  // when testing on Fb 20031209 win32 build the title of every sheet would be OK
  // the first time Cards was loaded, but then be an empty string every subsequent
  // load until Firebird was restarted.  Hence we use this hack based on the href
  var anySetRE = /\/cardsets\/[^.]*\.css$/;
  var thisSetRE = new RegExp(set+".css$");
  // switch stylesheets
  var sheets = document.styleSheets;
  for(var i = 0; i < sheets.length; i++) {
//    if(sheets[i].title) sheets[i].disabled = (sheets[i].title!=set);
    if(anySetRE.test(sheets[i].href)) sheets[i].disabled = !thisSetRE.test(sheets[i].href);
  }
  // save pref
  gPrefs.setCharPref("cardset",set);
}



function init() {
  // init the pref branch
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
  gPrefs = prefService.getBranch("games.cards.");

  // restore choice of cardset
  var cardset = "normal";
  try {
    cardset = gPrefs.getCharPref("cardset");
  } catch(e) {}
  useCardSet(cardset);
  document.getElementById("cardset-"+cardset).setAttribute("checked","true");

  Cards.init();
}


window.addEventListener("load", init, false);
