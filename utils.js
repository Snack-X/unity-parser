"use strict";

const BufferStream = require("./BufferStream");

// Ref: http://grain.exout.net/lz4/lz4.js
module.exports.unlz4 = function(bufIn) {
  let stream = new BufferStream(bufIn, false);

  stream.pos = 4;
  let decompressedSize = stream.readUInt32();
  let dataSize = stream.readUInt32();
  let endPos = dataSize + 16;
  stream.pos = 16;

  let output = Buffer.alloc(decompressedSize);
  let outputPos = 0;

  let readAdditionalSize = () => {
    let size = stream.readUInt8();
    if(size === 255) return size + readAdditionalSize();
    else return size;
  };

  while(true) {
    let token = stream.readUInt8();
    let sqSize = token >> 4;
    let matchSize = (token & 0x0f) + 4;

    if(sqSize === 15) sqSize += readAdditionalSize();

    stream.read(sqSize).copy(output, outputPos);
    outputPos += sqSize;

    if(endPos - 1 <= stream.pos) break;

    let offset = stream.readUInt16();

    if(matchSize === 19) matchSize += readAdditionalSize();

    if(offset < matchSize) {
      let matchPos = outputPos - offset;

      while(true) {
        output.copy(output, outputPos, matchPos, matchPos + offset);
        outputPos += offset;
        matchSize -= offset;
        if(matchSize < offset) break;
      }
    }

    output.copy(output, outputPos, outputPos - offset, outputPos - offset + matchSize);
    outputPos += matchSize;
  }

  return output;
};
