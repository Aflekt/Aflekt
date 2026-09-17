#!/bin/sh
# Lager assets/splat-share.gif fra bildene i video/plen/ (kjør `npm run record-plen` først).
# Samme avrundede hjørner som de andre kortene, og gifsicle --lossy holder fila rundt 1 MB.
set -e
R="a='if(lte(pow(max(0,max(18-X,X-(W-19))),2)+pow(max(0,max(18-Y,Y-(H-19))),2),324),255,0)'"
ffmpeg -v error -y -framerate 10 -i video/plen/%03d.png -vf "scale=440:-1:flags=lanczos,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':$R,split[a][b];[a]palettegen=max_colors=128:stats_mode=full:reserve_transparent=1[p];[b][p]paletteuse=dither=sierra2_4a:alpha_threshold=128" -loop 0 video/plen-raw.gif
npx gifsicle -O3 --lossy=60 video/plen-raw.gif -o assets/splat-share.gif
ls -la assets/splat-share.gif
