## Setup
1. ffmpeg generates segments based on a local file.
1. Safari creates a video element, pointing to the ffmpeg stream.
1. If the video errors, recreate the video element and try again
1. Report the final time from `navigationStart` to the `playing` event.

## Results

segment size | time to `playing`
--- | ---
2 seconds | 5.251205000000001 seconds
4 seconds | 9.18333 seconds
8 seconds | 17.242415 seconds
10 seconds | 21.237105000000003 seconds

If we delay opening the browser until three segments have been created, then playback is essentially immediate.
