"use strict";

// Ref: https://github.com/marcan/deresuteme/blob/master/decode.py
// Ref: https://github.com/RaduMC/UnityStudio

const BufferStream = require("./BufferStream");
const BaseString = require("./const").baseStrings;
const UnityAsset = require("./UnityAsset");

//==============================================================================

function parseUnityBundle(inBuf) {
  let stream = new BufferStream(inBuf);

  let signature = stream.readString().toString("ascii");
  if(signature !== "UnityRaw") throw `${signature} is not a valid signature`;

  let version1 = stream.readInt32();
  let version2 = stream.readString().toString("ascii");
  let version3 = stream.readString().toString("ascii");

  let bundleSize;
  if(version1 < 6) { bundleSize = stream.readInt32(); }
  else throw "Sorry! Unsupported `version1` ${version1}!";

  let dummy2 = stream.readInt16();
  let offset = stream.readInt16();
  let dummy3 = stream.readInt32();
  let lzmaChunks = stream.readInt32();

  let lzmaSize = 0, streamSize = 0;

  for(let i = 0 ; i < lzmaChunks ; i++) {
    lzmaSize = stream.readInt32();
    streamSize = stream.readInt32();
  }

  stream.pos = offset;

  // Get asset files
  let assets = [];
  let fileCount = stream.readInt32();

  for(let i = 0 ; i < fileCount ; i++) {
    let assetFilename = stream.readString().toString("ascii");

    let fileOffset = stream.readInt32();
    fileOffset += offset;

    let fileSize = stream.readInt32();
    let nextFile = stream.pos;

    stream.pos = fileOffset;

    let assetBuf = stream.read(fileSize);
    let assetStream = new BufferStream(assetBuf);

    assets.push(UnityAsset.parse(assetFilename, assetStream));

    stream.pos = nextFile;
  }

  return assets;
}

//==============================================================================

module.exports.parse = parseUnityBundle;
