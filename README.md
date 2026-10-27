# Cards

This is a single-page web app consisting of a collection of single-player card games.

It's only regularly tested in Firefox (and started life as a XUL add-on for it), though in principal there's no reason it shouldn't be cross-browser.  It's unpolished on touch-screen devices, though does include basic support for touch events.

Notable feature include:

  - over 40 different games or variants
  - hints available on request
  - unlimited undo/redo
  - cards are automatically moved to the foundation piles, but only once there is no reason to not do so (so you never end up fighting against the autoplay)
  - single-clicking a card will automatically move it to a suitable destination, relieving the drudgery of drag+drop
  - right-clicking will move a card to a suitable foundation (though this is infrequently needed, because of autoplay)


## Building/Running

First run `tsc` (the TypeScript command-line tool) to convert `src/typescript/*`
to `js/*`.  Then run `./dist.py`, which will concatenate all the HTML/CSS/JS
into a single file.  Then open `dist/cards.html` in a browser.

## Copyright/Licence

Copyright 2003-2026 Stephen Clavering &lt;stephen@clavering.me.uk&gt;
Copyright 2003 Neil Rashbrook &lt;neil@parkwaycc.co.uk&gt;
Copyright 2003 Derek Seabury &lt;drokzilla@seabury.net&gt;

The code and documentation are distributed under the MPL version 2.

The card images are public domain, originating in dondorf.svg from https://web.archive.org/web/20110712004247/http://www.rahga.com/svg/
