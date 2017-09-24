#!/bin/bash

# If you want to regenerate the .png images Cards used from the source .svg, use this tool
#
# Requirements:
#   "rsvg" (found in librsvg2-bin on ubuntu trusty)
#   "optipng"

# convert from .svg to .png
rsvg dondorf.svg cards.png
optipng -quiet cards.png

# generate the 2x Retina image
rsvg -z 2 $1 dondorf.svg cards-2x.png
optipng -quiet cards-2x.png
