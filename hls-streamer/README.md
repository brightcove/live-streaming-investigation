# Configuration Guide
* Install ffmpeg locally using homebrew with the necessary packages included using the following command:
  * `brew install ffmpeg --with-freetype --with-fontconfig`
* Add the credentials and bucket name for the S3 bucket that you want to use to store video files to the aws.json file
* Configure the project by setting variable values in index.js
  * Options:
    * **timestamp**: when set to true, a timestamp overlay will be added to each video frame
    * **showFfmpegOutput**: when set to true, all output from the ffmpeg command will be logged to the console
    * **segmentLength**: the target length of each segment
* When ready, start recording using the `npm start` command
* To view the stream, open vjs-player.html in Safari. Pressing the button below the player will pause playback and display the current datetime below the player so the delay can be calculated.
