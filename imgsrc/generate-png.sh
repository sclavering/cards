#!/bin/bash

# If you want to regenerate the .png images Cards used from the source .svg, use this tool
#
# Requirements:
#   "convert" from imagemagick
#   "rsvg" (found in librsvg2-bin on ubuntu trusty)
#   "optipng"
# Usage:
#   generate-png.sh dondorf.svg

if [ -z $1 ] || [ ! -e $1 ] ; then
    echo usage: $0 somefile.SVG
    exit 1
fi


CLUBS="tempimage-0.png tempimage-1.png tempimage-2.png tempimage-3.png tempimage-4.png tempimage-5.png tempimage-6.png tempimage-7.png tempimage-8.png tempimage-9.png tempimage-10.png tempimage-11.png tempimage-12.png"
DIAMONDS="tempimage-13.png tempimage-14.png tempimage-15.png tempimage-16.png tempimage-17.png tempimage-18.png tempimage-19.png tempimage-20.png tempimage-21.png tempimage-22.png tempimage-23.png tempimage-24.png tempimage-25.png"
HEARTS="tempimage-26.png tempimage-27.png tempimage-28.png tempimage-29.png tempimage-30.png tempimage-31.png tempimage-32.png tempimage-33.png tempimage-34.png tempimage-35.png tempimage-36.png tempimage-37.png tempimage-38.png"
SPADES="tempimage-39.png tempimage-40.png tempimage-41.png tempimage-42.png tempimage-43.png tempimage-44.png tempimage-45.png tempimage-46.png tempimage-47.png tempimage-48.png tempimage-49.png tempimage-50.png tempimage-51.png"
# -52 and -53 are blank white outlines
BACK="tempimage-54.png"
# all subsequent images are entirely transparent

# Note the suits are in a different order.
USEFUL_IMAGES="$SPADES $HEARTS $DIAMONDS $CLUBS $BACK"

# convert from .svg to .png
rsvg $1 tempimage-all.png
# chop up the single .png into one per card (plus some useless extras)
convert -crop 79x123 +page tempimage-all.png tempimage.png
# recombine the wanted images in the correct order in a single vertical strip
convert $USEFUL_IMAGES -colorspace sRGB -depth 16 -gravity North -append cards.png
# reduce the filesize a little
optipng cards.png
# remove the temp files
rm tempimage-*.png
