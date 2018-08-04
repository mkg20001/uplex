'use strict'

const protobuf = require('protons')
module.exports = protobuf(`

message Packet {
  required int64 id = 1;
  int32 state = 2;
  bytes data = 3;
}

`)
