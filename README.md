# Cards

This is a single-page web app consisting of a collection of single-player card games.

Currently it's probably only compatible with Firefox, due to using javascript features that other browsers don't support yet (though it would be nice to fix this, perhaps by using an ES6 transpiler).  It also doesn't work well on touch-screen devices, because the code for dragging/dropping cards only uses mouse events, and not touch events (which is probably relatively easy to fix).

Notable feature include:

  - over 40 different games or variants
  - hints available on request
  - unlimited undo/redo
  - cards are automatically moved to the foundation piles, but only once there is no reason to not do so (so you never end up fighting against the autoplay)
  - single-clicking a card will automatically move it to a suitable destination, relieving the drudgery of drag+drop
  - right-clicking will move a card to a suitable foundation (though this is infrequently needed, because of autoplay)


## Building/Running

Just run the build.py script (which generates code/cards.html by combining all the .js and other source files), and then load code/cards.html

Only the contents of code/ (including the generated cards.html) are needed to play the game.


## Copyright/Licence

Copyright 2003-2014 Stephen Clavering &lt;stephen@clavering.me.uk&gt;
Copyright 2003 Neil Rashbrook &lt;neil@parkwaycc.co.uk&gt;
Copyright 2003 Derek Seabury &lt;drokzilla@seabury.net&gt;

The code and documentation are distributed under the MPL version 2.


The card images are public domain, originating in dondorf.svg from https://web.archive.org/web/20110712004247/http://www.rahga.com/svg/
