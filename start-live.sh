#! /bin/sh
http-server &
open -a safari "http://localhost:8080/"
ffmpeg -re -i gear4-full.mp4 -f segment -segment_time 2 -segment_list index.m3u8 -segment_format mpegts %05d.ts
