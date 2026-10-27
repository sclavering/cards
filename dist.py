#!/usr/bin/env python3

# This script builds a single .html file for publishing, needing only two .png
# files for the card images.
#
# Folding all the JS and CSS into the main HTML file ensures they're all from
# the same version of the code, rather than ending up with some parts from an
# older version thanks to HTTP caching.
#
# The other point of this is that the .ts files were written for an older
# version of tsc that could produce a single output file, which v6.0 on no
# longer supports.  So we just do it here instead.

import os
import sys
import shutil
import json

path = os.path.dirname(os.path.abspath(sys.argv[0])) + '/'

try:
    os.mkdir(path + "dist")
except OSError:
    pass

# Concatenate the tsc output files, in order.
tsconfig = json.load(open("tsconfig.json"))
all_js = ""
for ts_file_path in tsconfig["files"]:
    basename = ts_file_path.removeprefix("src/typescript/").removesuffix(".ts")
    js_file_path = f"js/{basename}.js"
    all_js += open(js_file_path).read()

external_css = '<link rel="stylesheet" href="cards.css">'
external_js = '<script src="symlink_to_tsc_output.js"></script>'
inline_css = "<style>\n" + open(path + "src/cards.css").read() + "</style>\n"
inline_js = "<script>\n" + all_js + "</script>\n"

in_html = open(path + "src/cards.html").read()
out_html = in_html.replace(external_css, inline_css).replace(external_js, inline_js)
out_html_f = open(path + 'dist/cards.html', 'w')
out_html_f.write(out_html)

shutil.copy(path + "src/cards2.png", path + "dist/")
shutil.copy(path + "src/cards2-2x.png", path + "dist/")
