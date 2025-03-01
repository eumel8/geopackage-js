// @ts-nocheck
import { GeoPackageAPI } from '../..';
import { GeoPackage } from '../../lib/geoPackage';
import { GeoPackageConnection } from '../../lib/db/geoPackageConnection';

var fs = require('fs-extra')
  , path = require('path')
  , crypto = require('crypto')
  , ImageUtils = require('../../lib/tiles/imageUtils').ImageUtils;

module.exports.createTempName = function() {
  return 'gp_'+crypto.randomBytes(4).readUInt32LE(0)+'.gpkg';
};

module.exports.copyGeopackage = function(original) {
  var copy = path.join(__dirname, 'tmp', module.exports.createTempName());

  return new Promise(function(resolve, reject) {
    if (typeof(process) !== 'undefined' && process.version) {
      var fsExtra = require('fs-extra');
      fsExtra.copy(original, copy, function(err) {
        resolve(copy);
      });
    } else {
      resolve(copy);
    }
  })
}

module.exports.createTmpGeoPackage = async function() {
  var tmpGpPath = path.join(__dirname, 'tmp', module.exports.createTempName());
  var geopackage = await module.exports.createGeoPackage(tmpGpPath)
  return {
    geopackage,
    path: tmpGpPath
  }
}

module.exports.createGeoPackage = async function(gppath) {
  if (typeof(process) !== 'undefined' && process.version) {
    await fs.mkdirp(path.dirname(gppath));
    await fs.open(gppath, 'w');
    return await GeoPackageAPI.create(gppath)
  }
  else {
    return await GeoPackageAPI.create();
  }
};

module.exports.createBareGeoPackage = async function(gppath) {
  if (typeof(process) !== 'undefined' && process.version) {
    await fs.mkdirp(path.dirname(gppath))
    await fs.open(gppath, 'w');
    let connection = await GeoPackageConnection.connect(gppath);
    return new GeoPackage(path.basename(gppath), gppath, connection);
  }
  else {
    let connection = await GeoPackageConnection.connect();
    return new GeoPackage('geopackage', undefined, connection);
  }
};

module.exports.deleteGeoPackage = async function(gppath) {
  if (typeof(process) !== 'undefined' && process.version) {
    try {
      await fs.unlink(gppath);
    } catch (e) {}
  }
};

global.loadTile = module.exports.loadTile = async function(tilePath) {
  if (typeof(process) !== 'undefined' && process.version) {
    return fs.readFile(tilePath);
  } else {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', tilePath, true);
      xhr.responseType = 'arraybuffer';

      xhr.onload = function(e) {
        if (xhr.status !== 200) {
          return resolve();
        }
        return resolve(Buffer.from(this.response));
      };
      xhr.onerror = function(e) {
        reject(e);
      };
      xhr.send();
    });
  }
};

module.exports.diffImages = function(actualTile, expectedTilePath, callback) {
  module.exports.diffImagesWithDimensions(actualTile, expectedTilePath, 256, 256, callback);
};

module.exports.diffCanvas = async function(actualCanvas, expectedTilePath, callback) {
  if (typeof(process) !== 'undefined' && process.version) {
    return ImageUtils.getImage(expectedTilePath).then(img => {
      var Canvas = require('canvas');
      var expectedCanvas = Canvas.createCanvas(256, 256);
      expectedCanvas.getContext('2d').drawImage(img, 0, 0);
      let same = actualCanvas.toDataURL() === expectedCanvas.toDataURL();
      if (callback) {
        callback(null, same);
      }
      return same;
    });
  } else {
    module.exports.loadTile(expectedTilePath, function(err, expectedTile) {
      var expectedBase64 = Buffer.from(expectedTile).toString('base64');
      var CanvasCompare = require('canvas-compare');
      CanvasCompare.setImageData(ImageData);
      CanvasCompare.canvasCompare({
        baseImageUrl: actualCanvas.toDataURL(),
        targetImageUrl: 'data:image/png;base64,' + expectedBase64
      })
        .then(function(result) {
          if (callback) {
            callback(null, true);
          }
          return true;
        })
        .catch(function(reason) {
          if (callback) {
            callback(null, false);
          }
          return false;
        });
    });
  }

};

module.exports.diffCanvasesContexts = function(actualCtx, expectedCtx, width, height) {
  var actualData = actualCtx.getImageData(0, 0, width, height);
  var expectedData = expectedCtx.getImageData(0, 0, width, height);
  if(actualData.data.length != expectedData.data.length)
    return false;
  for(var i = 0; i < actualData.data.length; ++i){
    if(actualData.data[i] != expectedData.data[i]) {
      return false;
    }
  }
  return true;
};

module.exports.diffImagesWithDimensions = function(actualTile, expectedTilePath, width, height, callback) {
  if (typeof(process) !== 'undefined' && process.version) {
    ImageUtils.getImage(actualTile).then(actualImage => {
      var Canvas = require('canvas');
      var actualCanvas = Canvas.createCanvas(width, height);
      var actualCtx = actualCanvas.getContext('2d');
      actualCtx.drawImage(actualImage, 0, 0);
      ImageUtils.getImage(expectedTilePath).then(expectedImage => {
        var expectedCanvas = Canvas.createCanvas(width, height);
        var expectedCtx = expectedCanvas.getContext('2d');
        expectedCtx.drawImage(expectedImage, 0, 0);
        if (actualCanvas.toDataURL() !== expectedCanvas.toDataURL()) {
          console.log('actual');
          console.log(actualCanvas.toDataURL());
          console.log('expected');
          console.log(expectedCanvas.toDataURL());
        }
        callback(null, actualCanvas.toDataURL() === expectedCanvas.toDataURL());
      });
    });
  } else {
    if (actualTile instanceof Uint8Array) {
      var binary = '';
      var bytes = actualTile;
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
      }
      actualTile = 'data:image/png;base64,' + btoa( binary );
    }

    var actual = document.createElement('canvas');
    actual.width = width;
    actual.height = height;
    var ctx = actual.getContext('2d');
    ctx.clearRect(0, 0, actual.width, actual.height);

    var image = new Image();
    image.onload = function() {
      ctx.drawImage(image, 0, 0);
      module.exports.loadTile(expectedTilePath, function(err, expectedTile) {
        var expectedBase64 = Buffer.from(expectedTile).toString('base64');

        var expected = document.createElement('canvas');
        expected.width = width;
        expected.height = height;
        var ctx2 = expected.getContext('2d');
        ctx2.clearRect(0, 0, actual.width, actual.height);

        var image2 = new Image();
        image2.onload = function() {
          ctx2.drawImage(image2, 0, 0);
          var equal = module.exports.diffCanvasesContexts(ctx, ctx2, width, height);

          if (!equal) {
            var h1Tags = document.getElementsByTagName('h1');
            var h2Tags = document.getElementsByTagName('li');
            var currentTag;
            if (h2Tags.length === 0) {
              currentTag = h1Tags.item(h1Tags.length - 1);
            } else {
              currentTag = h2Tags.item(h2Tags.length -1).parentNode;
            }
            var div = document.createElement('div');
            var span1 = document.createElement('span');
            span1.style.width = width + 'px';
            span1.style.display = 'inline-block';
            span1.innerHTML = 'Actual';
            var span2 = document.createElement('span');
            span2.style.width = width + 'px';
            span2.style.display = 'inline-block';
            span2.innerHTML = 'Expected';
            var span3 = document.createElement('span');
            span3.style.width = width + 'px';
            span3.style.display = 'inline-block';
            span3.innerHTML = 'Diff';

            div.appendChild(span1);
            div.appendChild(span2);
            div.appendChild(span3);
            currentTag.appendChild(div);
            currentTag.appendChild(actual);
            currentTag.appendChild(expected);

            var CanvasCompare = require('canvas-compare');
            CanvasCompare.setImageData(ImageData);
            CanvasCompare.canvasCompare({
              baseImageUrl: actual.toDataURL(),
              targetImageUrl: expected.toDataURL()
            })
              .then(function(result) {
                currentTag.appendChild(result.producePreview());
                callback(null, true);
              })
              .catch(function(reason) {
                callback(null, false);
              });
          } else {
            callback(null, equal);
          }
        };
        image2.src = 'data:image/png;base64,' + expectedBase64;
      });
    };
    image.src = actualTile;
  }

};

export default module.exports;
