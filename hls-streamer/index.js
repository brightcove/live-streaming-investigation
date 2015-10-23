/*
For this to work properly, ffmpeg should be installed using homebrew with the following command:
brew install ffmpeg --with-freetype --with-fontconfig

Also, correct key info must be added to aws.json
*/

'use strict'

var
  fs = require('fs'),
  spawn = require('child_process').spawn,
  async = require('async'),
  S3 = require('aws-sdk').S3,

  awsConfig = require('./aws.json').awsConfig,
  s3 = new S3(awsConfig),
  bucketName = awsConfig.bucket,

  tsSegmentsInProgress = [],

  // Configuration Variables
  videoDirPath = './video_assets/',
  // With timestamp set to true, a timestamp overlay is added to each frame
  timestamp = true,
  showFfmpegOutput = false,
  segmentLength = '2',

  // FFMPEG command components
  ffmpegInputCommand = 'ffmpeg -f avfoundation -r 30.00 -s 1280x720 -i "0" ',
  ffmpegOutputCommand = '-strict experimental ' +
    '-f segment -segment_time ' + segmentLength + ' -segment_list index.m3u8 -segment_format mpegts stream%05d.ts',
  drawTimestamp = ' -vf \'drawtext=text=%{localtime}: fontsize=100: fontcolor=red: x=10: y=10\' ',

  resetLocalVideoDir = function(callback) {
    spawn('sh', ['-c', 'rm -rf ' + videoDirPath + ' && mkdir ' + videoDirPath],
      {stdio: ['ignore', 'ignore', 'ignore']})
      .on('error', function(error) {
        return callback(error);
      })
      .on('close', function(code) {
        console.log('Successfully deleted and recreated the video_assets directory');
        return callback();
      });
  },

  emptyS3Bucket = function(callback) {
    async.waterfall([
      function listAllBucketObjects(next) {
        s3.listObjects({Bucket: bucketName}, function(err, data) {
          if (err) {
            return next(err);
          } else {
            console.log('Found', data.Contents.length, 'items in the', bucketName, 'bucket.');
            return next(null, data.Contents);
          }
        });
      },
      // Restructure the object array to conform to the structure used the deleteObjects function
      function restructureObjectsArray(objectsArray, next) {
        var newObjectsArray = [];

        for (var i = 0; i < objectsArray.length; i++) {
          newObjectsArray.push({ Key: objectsArray[i].Key });
        }
        return next(null, newObjectsArray);
      },
      function deleteAllBucketObjects(newObjectsArray, next) {
        var deleteParams = {
          Bucket: bucketName,
          Delete: {
            Objects: newObjectsArray
          }
        };
        // Only make the delete call if there are items to delete
        if (newObjectsArray.length > 0) {
          s3.deleteObjects(deleteParams, function(err, data) {
            if (err) {
              return next(err);
            } else {
              console.log('Successfully deleted', newObjectsArray.length, 'items from the S3 bucket.');
              return next();
            }
          });
        } else {
          console.log('No items to delete, skipping the delete step.');
          return next();
        }
      }
    ], function(err) {
      callback(err);
    });
  },

  pushToS3 = function(filename, fileDirPath, mimeType, callback) {
    // fs.readFile(fileDirPath + filename, 'utf8', function(error, contents) {
    fs.readFile(fileDirPath + filename, function(error, contents) {
      var params = {
        Bucket: awsConfig.bucket,
        Key: filename,
        Body: contents,
        ContentType: mimeType,
        ACL: 'public-read'
      };

      if (error) {
        return callback(error);
      } else {
        s3.putObject(params, function(err, data) {
          console.log('Pushed', filename, 'to S3.');
          return callback(err);
        });
      }
    });
  },

  maybeUpdateS3 = function(event, filename) {
    var mimeType, fileIndex;

    if (filename.indexOf('.ts') !== -1) {
      // The first event for a new .ts file is the initialization event, and we don't want
      // to push it to S3 yet.
      if (tsSegmentsInProgress.indexOf(filename) === -1) {
        tsSegmentsInProgress.push(filename);
      } else {
        // The second time we see a .ts file is the completion event, and we want to push it to S3
        mimeType = 'video/MP2T';

        async.waterfall([
          async.apply(pushToS3, filename, videoDirPath, mimeType),
          // Delete the .ts file locally
          async.apply(fs.unlink, videoDirPath + filename)
        ], function(err) {
          if (err) {
            console.log('An error occurred for', filename,'in updateS3:', err);
          } else {
            // Remove the .ts file from the in progress array
            fileIndex = tsSegmentsInProgress.indexOf(filename);
            tsSegmentsInProgress.splice(fileIndex, 1);
          }
        });
      }
    } else {
      // Ignore any .m3u8.tmp files
      if (filename.indexOf('.tmp') === -1) {
        mimeType = 'application/x-mpegURL';

        async.waterfall([
          async.apply(pushToS3, filename, videoDirPath, mimeType)
        ], function(err) {
          if (err) {
            console.log('An error occurred for the .m3u8 file in updateS3', err);
          }
        });
      }
    }
  },

  // Watch the video_assets directory for changes
  watchVideoDir = function(callback) {
    fs.watch(videoDirPath, function(event, filename) {
      maybeUpdateS3(event, filename);
    });
    return callback();
  },

  // Start recording video and placing segments in the video_assets directory
  // This will keep running in the background throughout
  startRecording = function(callback) {
    var
      recordCommand = timestamp ? ffmpegInputCommand + drawTimestamp + ffmpegOutputCommand :
        ffmpegInputCommand + ffmpegOutputCommand,

      ffmpegOutput = showFfmpegOutput ? [process.stdio, process.stdio, process.stderr] :
       ['ignore', 'ignore', 'ignore'];

    console.log('Recording using ffmpeg command:', recordCommand);

    spawn('sh', ['-c', 'cd ' + videoDirPath + ' && ' + recordCommand],
      {stdio: ffmpegOutput})
      .on('error', function(error) {
        throw error;
      })
      .on('close', function(code) {
        console.log('Exited with code', code);
      });
    return callback();
  };

async.waterfall([
  resetLocalVideoDir,
  emptyS3Bucket,
  // Push CORS configuration file to S3 to allow cross site get requests
  async.apply(pushToS3, 'cors.xml', './', 'application/xml'),
  watchVideoDir,
  startRecording
], function(err) {
  if (err) {
    console.log('An error occurred during the setup waterfall:', err);
  }
})

