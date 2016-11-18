"use strict";

const UnityBundle = require("./UnityBundle");
const UnityAsset = require("./UnityAsset");

module.exports.UnityBundle = UnityBundle;
module.exports.UnityAsset = UnityAsset;

//==============================================================================

const fs = require("fs");
const utils = require("./utils");

function load(buf, lz4 = false) {
  let inBuf;
  if(lz4) inBuf = utils.unlz4(buf);
  else inBuf = Buffer.from(buf);
  return UnityBundle.parse(inBuf);
}

function loadFile(filename) {
  let inBuf = fs.readFileSync(filename);
  return load(inBuf, filename.endsWith(".unity3d.lz4"));
}

module.exports.load = load;
module.exports.loadFile = loadFile;
