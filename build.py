#!/usr/bin/env python

import os, sys

JS_FILES = [
    "build/util.js",
    "src/js/main.js",
    "build/lib-cards.js",
    "build/lib-views.js",
    "build/lib-layouts.js",
    "build/lib-piles.js",
    "src/js/lib-animation.js",
    "src/js/lib-freecellanimation.js",
    "src/js/autoplay.js",
    "build/lib-actions.js",
    "src/js/lib-game.js",
    "src/js/lib-freecell.js",

    "src/js/game-acesup.js",
    "src/js/game-canfield.js",
    "src/js/game-doublesol.js",
    "src/js/game-fan.js",
    "src/js/game-fortythieves.js",
    "src/js/game-freecell.js",
    "src/js/game-golf.js",
    "src/js/game-gypsy.js",
    "src/js/game-klondike.js",
    "src/js/game-maze.js",
    "src/js/game-mod3.js",
    "src/js/game-penguin.js",
    "src/js/game-pileon.js",
    "src/js/game-pyramid.js",
    "src/js/game-regiment.js",
    "src/js/game-russiansol.js",
    "src/js/game-spider.js",
    "src/js/game-towers.js",
    "src/js/game-unionsquare.js",
    "src/js/game-whitehead.js",
    "src/js/game-winston.js",
    "src/js/game-yukon.js",
]


path = os.path.dirname(os.path.abspath(sys.argv[0])) + '/'


try:
    os.mkdir(path + "dist")
except OSError:
    pass


js_code = ""
for fn in JS_FILES:
    js_code += "// ===== " + fn + " =====\n\n"
    js_code += open(path + fn).read()
    js_code += "\n\n\n\n"
js_code = '<script type="application/javascript;version=1.7">\n' + js_code + '</script>\n'

css_code = "<style>\n" + open(path + "src/cards.css").read() + "</style>\n"

html_code = open(path + "src/cards_raw.html").read()

html_code = html_code.replace('###STYLE_AND_SCRIPT###', css_code + js_code)


f = open(path + 'dist/cards.html', 'w')
f.write(html_code)


import shutil
shutil.copy(path + "src/cards.png", path + "dist/")
shutil.copy(path + "src/help.html", path + "dist/")
