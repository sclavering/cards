#!/usr/bin/env python

# This script generates dondorf.svg (in part using definitions from dondorf.svg.defs).

WIDTH = 79
HEIGHT = 123


# caller should provide the closing </g>.
def generate_card(out, grid_x, grid_y, fill=""):
    if fill: fill = ' fill="{}"'.format(fill)
    out.append('<g transform="translate({}, {})"{}>'.format(grid_x * WIDTH, grid_y * HEIGHT, fill))
    out.append('    <use xlink:href="#card-background"/>')


def generate_card_back(out, grid_x, grid_y):
    generate_card(out, grid_x, grid_y)
    out.append('    <use xlink:href="#im-card-back" x="6" y="6.5"/>')
    out.append('</g>')


def generate_suit(out, suit, colour, grid_y0):
    for ix in range(0, 13):
        generate_card(out, 0, grid_y0 + ix, colour)
        # The numbers
        out.append('    <use xlink:href="#num-{}" stroke="{}" x="1" y="-.5"/>'.format(ix + 1, colour))
        out.append('    <use xlink:href="#num-{}" stroke="{}" x="63" y="100.5"/>'.format(ix + 1, colour))
        # The small suit indicators next to the numbers
        out.append('    <use xlink:href="#{}-small" transform="translate(8.5,24.5)"/>'.format(suit))
        out.append('    <use xlink:href="#{}-small" transform="translate(70.5,98.5)"/>'.format(suit))
        # The pips, or image
        generate_interior(out, suit, ix + 1)
        out.append('</g>')


def generate_interior(out, suit, num):
    if num in [11, 12, 13]:
        out.append('    <use xlink:href="#im-{}-{}" x="15" y="13"/>'.format(suit, num))
        out.append('    <rect x="15.5" y="13.5" width="48" height="96" stroke-width="1" stroke="black" fill="none"/>')
        return
    generate_pips(out, suit, num)


def generate_pips(out, suit, num):
    if num in [1, 3, 5, 9]:
        out.append('    <use transform="translate(39.5,61.5)" xlink:href="#{}-large"/>'.format(suit))
    if num in [2, 3]:
        out.append('    <use transform="translate(39.5,21.5)" xlink:href="#{}-large"/>'.format(suit))
        out.append('    <use transform="translate(39.5,101.5)" xlink:href="#{}-large"/>'.format(suit))
    if num in [4, 5, 6, 7, 8, 9, 10]:
        out.append('    <use transform="translate(23.5,21.5)" xlink:href="#{}-large"/>'.format(suit))
        out.append('    <use transform="translate(23.5,101.5)" xlink:href="#{}-large"/>'.format(suit))
        out.append('    <use transform="translate(55.5,21.5)" xlink:href="#{}-large"/>'.format(suit))
        out.append('    <use transform="translate(55.5,101.5)" xlink:href="#{}-large"/>'.format(suit))
    if num in [6, 7, 8]:
        out.append('    <use transform="translate(23.5,61.5)" xlink:href="#{}-large"/>'.format(suit))
        out.append('    <use transform="translate(55.5,61.5)" xlink:href="#{}-large"/>'.format(suit))
    if num in [7, 8]:
        out.append('    <use transform="translate(39.5,41.5)" xlink:href="#{}-large"/>'.format(suit))
    if num in [8]:
        out.append('    <use transform="translate(39.5,81.5)" xlink:href="#{}-large"/>'.format(suit))
    if num in [9, 10]:
        out.append('    <use transform="translate(23.5,48.25)" xlink:href="#{}-large"/>'.format(suit))
        out.append('    <use transform="translate(23.5,74.75)" xlink:href="#{}-large"/>'.format(suit))
        out.append('    <use transform="translate(55.5,48.25)" xlink:href="#{}-large"/>'.format(suit))
        out.append('    <use transform="translate(55.5,74.75)" xlink:href="#{}-large"/>'.format(suit))
    if num in [10]:
        out.append('    <use transform="translate(39.5,34.875)" xlink:href="#{}-large"/>'.format(suit))
        out.append('    <use transform="translate(39.5,88.125)" xlink:href="#{}-large"/>'.format(suit))


def generate(defs):
    out = []

    height = (5 * 13 + 1) * HEIGHT

    out.append('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="0 0 {width} {height}" version="1.1">'.format(width=WIDTH, height=height))
    out += ['<defs>', defs, '</defs>']

    generate_suit(out, "spade", "black", 0)
    generate_suit(out, "heart", "#DF0000", 13)
    generate_suit(out, "diamond", "#DF0000", 26)
    generate_suit(out, "club", "black", 39)
    generate_suit(out, "club", "#93c000", 52)

    generate_card_back(out, 0, 65)

    out.append('</svg>')

    return "\n".join(out)


def main():
    defs = open('dondorf.defs.svg').read()
    f = open('dondorf.svg', 'w')
    f.write(generate(defs))
    f.close()


if __name__ == "__main__":
    main()
