"use strict";

const UnityBundle = require("./UnityBundle");
const UnityAsset = require("./UnityAsset");

module.exports.UnityBundle = UnityBundle;
module.exports.UnityAsset = UnityAsset;

//==============================================================================

const fs = require("fs");
const utils = require("./utils");

function loadFile(filename) {
  let inBuf = fs.readFileSync(filename);

  if(filename.endsWith(".unity3d.lz4")) inBuf = utils.unlz4(inBuf);

  return UnityBundle.parse(inBuf);
}

module.exports.loadFile = loadFile;
