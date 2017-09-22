#!/bin/bash

# If you want to regenerate the .png images Cards used from the source .svg, use this tool
#
# Requirements:
#   "convert" from imagemagick
#   "rsvg" (found in librsvg2-bin on ubuntu feisty)
# Usage:
#   make-images.sh svgfilename.svg
# Result:
#   Temporarily creates tempimage-{0-64}.png
#   These are then renamed to [CDHS]{1-13}.png, e.g. C1.png, H12.png,
#   and also misc-{1-13}.png, one of which is probably the card back.

if [ -z $1 ] || [ ! -e $1 ] ; then
  echo "usage:" $0 somefile.SVG
else
  rsvg $1 tempimage-all.png
  convert -crop 79x123 +page tempimage-all.png tempimage.png
  rm tempimage-all.png
  mv tempimage-0.png C1.png
  mv tempimage-1.png C2.png
  mv tempimage-2.png C3.png
  mv tempimage-3.png C4.png
  mv tempimage-4.png C5.png
  mv tempimage-5.png C6.png
  mv tempimage-6.png C7.png
  mv tempimage-7.png C8.png
  mv tempimage-8.png C9.png
  mv tempimage-9.png C10.png
  mv tempimage-10.png C11.png
  mv tempimage-11.png C12.png
  mv tempimage-12.png C13.png
  mv tempimage-13.png D1.png
  mv tempimage-14.png D2.png
  mv tempimage-15.png D3.png
  mv tempimage-16.png D4.png
  mv tempimage-17.png D5.png
  mv tempimage-18.png D6.png
  mv tempimage-19.png D7.png
  mv tempimage-20.png D8.png
  mv tempimage-21.png D9.png
  mv tempimage-22.png D10.png
  mv tempimage-23.png D11.png
  mv tempimage-24.png D12.png
  mv tempimage-25.png D13.png
  mv tempimage-26.png H1.png
  mv tempimage-27.png H2.png
  mv tempimage-28.png H3.png
  mv tempimage-29.png H4.png
  mv tempimage-30.png H5.png
  mv tempimage-31.png H6.png
  mv tempimage-32.png H7.png
  mv tempimage-33.png H8.png
  mv tempimage-34.png H9.png
  mv tempimage-35.png H10.png
  mv tempimage-36.png H11.png
  mv tempimage-37.png H12.png
  mv tempimage-38.png H13.png
  mv tempimage-39.png S1.png
  mv tempimage-40.png S2.png
  mv tempimage-41.png S3.png
  mv tempimage-42.png S4.png
  mv tempimage-43.png S5.png
  mv tempimage-44.png S6.png
  mv tempimage-45.png S7.png
  mv tempimage-46.png S8.png
  mv tempimage-47.png S9.png
  mv tempimage-48.png S10.png
  mv tempimage-49.png S11.png
  mv tempimage-50.png S12.png
  mv tempimage-51.png S13.png
  mv tempimage-52.png misc1.png
  mv tempimage-53.png misc2.png
  mv tempimage-54.png misc3.png
  mv tempimage-55.png misc4.png
  mv tempimage-56.png misc5.png
  mv tempimage-57.png misc6.png
  mv tempimage-58.png misc7.png
  mv tempimage-59.png misc8.png
  mv tempimage-60.png misc9.png
  mv tempimage-61.png misc10.png
  mv tempimage-62.png misc11.png
  mv tempimage-63.png misc12.png
  mv tempimage-64.png misc13.png
fi

