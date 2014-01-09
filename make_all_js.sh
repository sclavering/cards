#!/bin/sh

# the ordering of these matters, e.g. FreeCellGame needs BaseCardGame to already be defined

cat \
    js/util.js \
    js/main.js \
    js/lib-cards.js \
    js/lib-views.js \
    js/lib-layouts.js \
    js/lib-piles.js \
    js/lib-animation.js \
    js/autoplay.js \
    js/getAutoplayableNumbers.js \
    js/getBestDestinationFor.js \
    js/lib-actions.js \
    js/lib-game.js \
    js/lib-freecell-move-sequencer.js \
    js/game*.js \
  > code/all.js
