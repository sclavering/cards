#!/usr/bin/env python

import os, sys

JS_FILES = [
    "build/util.js",
    "build/main.js",
    "build/lib-cards.js",
    "build/lib-views.js",
    "build/lib-layouts.js",
    "build/lib-piles.js",
    "build/lib-animation.js",
    "build/lib-freecellanimation.js",
    "build/lib-autoplay.js",
    "build/lib-actions.js",
    "build/lib-game.js",
    "build/lib-freecell.js",

    "build/game-acesup.js",
    "build/game-canfield.js",
    "build/game-doublesol.js",
    "build/game-fan.js",
    "build/game-fortythieves.js",
    "build/game-freecell.js",
    "build/game-golf.js",
    "build/game-gypsy.js",
    "build/game-klondike.js",
    "build/game-maze.js",
    "build/game-mod3.js",
    "build/game-penguin.js",
    "build/game-pileon.js",
    "build/game-pyramid.js",
    "build/game-regiment.js",
    "build/game-russiansol.js",
    "build/game-spider.js",
    "build/game-towers.js",
    "build/game-unionsquare.js",
    "build/game-whitehead.js",
    "build/game-winston.js",
    "build/game-yukon.js",
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
