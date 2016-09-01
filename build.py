#!/usr/bin/env python

import os, sys

JS_FILES = [
    "build.js"
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
js_code = '<script>\n' + js_code + '</script>\n'

css_code = "<style>\n" + open(path + "src/cards.css").read() + "</style>\n"

html_code = open(path + "src/cards_raw.html").read()

html_code = html_code.replace('###STYLE_AND_SCRIPT###', css_code + js_code)


f = open(path + 'dist/cards.html', 'w')
f.write(html_code)


import shutil
shutil.copy(path + "src/cards.png", path + "dist/")
shutil.copy(path + "src/help.html", path + "dist/")
