"use strict";

const BaseString = require("./const").baseStrings;
const ClassId = require("./const").classId;

//==============================================================================

Buffer.prototype.readString = function(pos) {
  // Prototype modification considered harmful, but whatever ¯\_(ツ)_/¯
  let nextNull = this.indexOf(0x00, pos);
  if(nextNull === -1) return null;
  let part = this.slice(pos, nextNull)
  return part;
};

const leftZeroPad = (v, l) => {
  let o = "" + v;
  while(o.length < l) o = "0" + o;
  return o;
};

//==============================================================================

function parseUnityAsset(filename, stream) {
  let tableSize = stream.readUInt32();
  let dataEnd = stream.readUInt32();
  let fileGen = stream.readUInt32();
  let dataOffset = stream.readUInt32();

  if(fileGen !== 15) throw "Sorry! Unsupported `fileGen` ${fileGen}!";

  stream.pos += 4;
  let version = stream.readString().toString("ascii");
  let platform = stream.readInt32();
  let baseDefinitions = stream.readInt8() === 1;

  if(platform > 255 || platform < 0) {
    let tbuf = Buffer.alloc(4);
    tbuf.writeInt32BE(platform, 0);
    platform = tbuf.readInt32LE(0);
    stream.isBigEndian = false;
  }

  // Reading definitions {
    let definitionCount = stream.readUInt32();
    let definition = {};

    for(let i = 0 ; i < definitionCount ; i++) {
      let classId = stream.readInt32();
      if(classId < 0) stream.pos += 16;
      stream.pos += 16;

      let varCount = stream.readUInt32();
      let stringSize = stream.readUInt32();

      stream.pos += varCount * 24;
      let varStrings = stream.read(stringSize);
      stream.pos -= varCount * 24 + stringSize;

      let def = [];
      for(let j = 0 ; j < varCount ; j++) {
        let num0 = stream.readUInt16();
        let level = stream.readInt8();
        let isArray = stream.readInt8() === 1;

        let varTypeIndex = stream.readUInt16();
        let test = stream.readUInt16();
        let varType = (test === 0 ?
          varStrings.readString(varTypeIndex).toString("ascii") :
          BaseString[varTypeIndex] || varTypeIndex.toString()
        );

        let varNameIndex = stream.readUInt16();
        test = stream.readUInt16();
        let varName = (test === 0 ?
          varStrings.readString(varNameIndex).toString("ascii") :
          BaseString[varNameIndex] || varNameIndex.toString()
        );

        let size = stream.readUInt32();
        let index = stream.readUInt32();
        let flags = stream.readUInt32();

        let pushAt = def;
        for(let lv = 0 ; lv < level ; lv++)
          pushAt = pushAt[pushAt.length - 1].children;

        pushAt.push({
          type: varType,
          name: varName,
          size, flags, isArray,
          children: []
        });
      }

      stream.pos += stringSize;

      definition[classId] = def[0];
    }
  // Reading definitions }

  // Reading data {
    let dataCount = stream.readInt32();
    let data = {};

    for(let i = 0 ; i < dataCount ; i++) {
      stream.align(4);

      let pathId = [
        leftZeroPad(stream.readUInt32().toString(16), 8),
        leftZeroPad(stream.readUInt32().toString(16), 8)
      ];
      pathId = stream.isBigEndian ? pathId[0] + pathId[1] : pathId[1] + pathId[0];

      let offset = stream.readUInt32();
      let size = stream.readUInt32();
      let type1 = stream.readInt32();
      let type2 = stream.readUInt16();
      stream.pos += 2;
      let unk1 = stream.readInt8();

      let savepoint = stream.pos;
      stream.pos = dataOffset + offset;

      let dataType = ClassId[type2];
      let assetData = readUnityAssetData(stream, definition[type1]);
      data[pathId] = assetData;
      stream.pos = savepoint;
    }
  // Reading data }

  return { definition, data };
}

function readUnityAssetData(stream, definition) {
  if(definition.isArray) {
    let defArraySize = definition.children[0];
    let arrSize = readUnityAssetData(stream, defArraySize);

    let defArrayValue = definition.children[1];
    if(defArrayValue.type === "UInt8" || defArrayValue.type === "char")
      return stream.read(arrSize);
    else {
      let output = [];
      for(let i = 0 ; i < arrSize ; i++)
        output.push(readUnityAssetData(stream, defArrayValue));
      return output;
    }
  }
  else if(0 < definition.children.length) {
    let values = {};
    for(let childDef of definition.children)
      values[childDef.name] = readUnityAssetData(stream, childDef);

    if(definition.children.length === 1 && definition.type === "string")
      return values["Array"].toString("binary");

    return values;
  }
  else {
    let alignBy = Math.min(definition.size, 4);
    stream.align(alignBy);

    let buf = stream.read(definition.size);

    switch(definition.type) {
      case "int":
        return stream.isBigEndian ? buf.readInt32BE(0) :  buf.readInt32LE(0);
      case "char":
        return String.fromCharCode(buf.readInt8(0));
      case "bool":
        return buf.readInt8(0) === 1;
      case "float":
        return stream.isBigEndian ? buf.readFloatBE(0) :  buf.readFloatLE(0);
      case "UInt16":
        return stream.isBigEndian ? buf.readUInt16BE(0) :  buf.readUInt16LE(0);
      case "UInt8":
        return buf.readUInt8(0);
      case "unsigned int":
        return stream.isBigEndian ? buf.readUInt32BE(0) :  buf.readUInt32LE(0);
      case "int64":
        if(definition.name !== "m_PathID") return buf;
        if(stream.isBigEndian) {
          return leftZeroPad(buf.readUInt32BE(0).toString(16), 8) +
                 leftZeroPad(buf.readUInt32BE(4).toString(16), 8);
        }
        else {
          return leftZeroPad(buf.readUInt32LE(4).toString(16), 8) +
                 leftZeroPad(buf.readUInt32LE(0).toString(16), 8);
        }
    }

    return buf;
  }
}

//==============================================================================

module.exports.parse = parseUnityAsset;
