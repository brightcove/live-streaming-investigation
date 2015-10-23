Setting up MPEG-DASH Livestreaming
=================================

Warning: This is kind of a pain

Installation
============

- Setup of a VM using [VirtualBox](https://www.virtualbox.org/wiki/Downloads) with [Ubuntu 14.04](http://www.ubuntu.com/download/desktop)
- Install FFMPEG
-- You need to install this from source, as there is no valid ffmpeg package in the package manager on Ubuntu 14.04
-- Install [FFMPEG 2.5](https://www.ffmpeg.org/releases/ffmpeg-2.5.8.tar.xz) (the latest version will has issues when it's used to compile GPAC)
- Install GPAC
-- You need to install the latest GPAC from source, as DashCast in the package manager is broken
-- Clone or download [GPAC from Github](https://github.com/gpac/gpac)
- Install Node (any version above 0.10.30 should be fine)
- Clone [node-gpac-dash](https://github.com/gpac/node-gpac-dash)

Streaming
=========

Viewing through MP4Client

```
DashCast -vf video4linux2 -vres 640x480 -vfr 30 -v /dev/video0 -live -low-delay -frag 200 -insert-utc -seg-marker eods -min-buffer 0.2 -ast-offset -800 -pixf yuv420p

node gpac-dash.js -segment-marker eods -chunk-media-segments

MP4Client http://127.0.0.1:8000/output/dashcast.mpd -opt Network:BufferLength=200 -opt DASH:LowLatency=chunk -opt DASH:UseServerUTC=no
```

Through a Browser
=================

Grab Dash.js, set it up (this is the most basic use case)

```
DashCast -vf video4linux2 -vres 640x480 -vfr 30 -v /dev/video0 -live -seg-dur 10000 -gop 30
```
