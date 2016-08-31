#!/usr/bin/env python

import os, sys

JS_FILES = [
    'util.js',
    'main.js',
    'lib-cards.js',
    'lib-views.js',
    'lib-layouts.js',
    'lib-piles.js',
    'lib-animation.js',
    'lib-freecellanimation.js',
    'autoplay.js',
    'lib-actions.js',
    'lib-game.js',
    'lib-freecell.js',

    'game-acesup.js',
    'game-canfield.js',
    'game-doublesol.js',
    'game-fan.js',
    'game-fortythieves.js',
    'game-freecell.js',
    'game-golf.js',
    'game-gypsy.js',
    'game-klondike.js',
    'game-maze.js',
    'game-mod3.js',
    'game-penguin.js',
    'game-pileon.js',
    'game-pyramid.js',
    'game-regiment.js',
    'game-russiansol.js',
    'game-spider.js',
    'game-towers.js',
    'game-unionsquare.js',
    'game-whitehead.js',
    'game-winston.js',
    'game-yukon.js',
]


path = os.path.dirname(os.path.abspath(sys.argv[0])) + '/'


try:
    os.mkdir(path + "dist")
except OSError:
    pass


js_code = ""
for fn in JS_FILES:
    js_code += "// ===== " + fn + " ===== \n\n"
    js_code += open(path + "src/js/" + fn).read()
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
