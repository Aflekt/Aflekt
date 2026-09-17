#!/bin/sh
# Lager assets/blinklysprove.gif fra opptaket i video/ (kjør `npm run record` først).
# Hjørnene gjøres gjennomsiktige med samme radius (18px) som SVG-kortene,
# og gifsicle -O3 gjenopprettet frame-diff-komprimeringen som alfa-kanalen ødelegger.
set -e
V=$(ls video/*.webm | head -1)
R="a='if(lte(pow(max(0,max(18-X,X-(W-19))),2)+pow(max(0,max(18-Y,Y-(H-19))),2),324),255,0)'"
ffmpeg -v error -y -ss 0.6 -i "$V" -vf "fps=12,scale=440:-1:flags=lanczos,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':$R,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff:reserve_transparent=1[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle:alpha_threshold=128" -loop 0 video/raw.gif
npx gifsicle -O3 video/raw.gif -o assets/blinklysprove.gif
ls -la assets/blinklysprove.gif
