"use strict";

const lz4 = require("lz4");

module.exports.unlz4 = function(bufIn) {
  let unpackedSize = bufIn.readUInt32LE(4);
  let fileSize = bufIn.readUInt32LE(8);
  let compressed = bufIn.slice(16, 16 + fileSize);

  let bufOut = new Buffer(unpackedSize);
  lz4.decodeBlock(compressed, bufOut);

  return bufOut;
};
