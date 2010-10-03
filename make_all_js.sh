#!/bin/sh

# the ordering of these matters, e.g. FreeCellGame needs BaseCardGame to already be defined
LIB_JS_FILES="js/lib-cards.js js/lib-views.js js/lib-layouts.js js/lib-piles.js js/lib-animation.js js/lib-rules.js js/lib-actions.js js/lib-game.js js/lib-freecell-move-sequencer.js"

cat js/util.js js/strings.js js/main.js $LIB_JS_FILES js/game*.js > code/all.js
