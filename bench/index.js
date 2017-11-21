"use strict"

const Benchmark = require('benchmark')
const pull = require("pull-stream")
const PeerInfo = require("peer-info")

const Libp2p = require("libp2p")

const TCP = require("libp2p-tcp")

const SPDY = require('libp2p-spdy')
const MULTIPLEX = require('libp2p-multiplex')
const UPLEX = require('../libp2p')

const {
  map
} = require('async')
const PeerId = require('peer-id')

let suite = new Benchmark.Suite

const sample = process.env.TINY_CHUNKS ? ".".repeat(100).split("").map(() => Buffer.from("HELLO")) : [Buffer.from("HELLO".repeat(10000))]

map(require('../test/ids.json'), PeerId.createFromJSON, (e, ids) => {
  if (e) throw e
  global.id = ids[0]
  global.ids = ids

  let port = 8670

  const createLibp2pNode = ({
    muxer,
    name
  }, cb) => {
    const pi = new PeerInfo(global.id)
    pi.multiaddrs.add("/ip4/127.0.0.1/tcp/" + port++)
    const swarm = new Libp2p({
      transport: [
        new TCP()
      ],
      connection: {
        muxer,
        crypto: []
      }
    }, pi)
    swarm.handle("/echo/1.0.0", (proto, conn) => pull(conn, conn))
    swarm.handle("/blackhole/1.0.0", (proto, conn) => pull(pull.values([]), conn, pull.drain()))
    swarm.start(err => {
      if (err) return cb(err)
      cb(null, {
        name,
        swarm,
        muxer
      })
    })
  }

  map([{
    name: "spdy",
    muxer: SPDY
  }, {
    name: "multiplex",
    muxer: MULTIPLEX
  }, {
    name: "uplex",
    muxer: UPLEX
  }], createLibp2pNode, (err, muxers) => {
    if (err) throw err
    muxers
      .reduce((suite, muxer) => suite.add("Muxer#" + muxer.name, d => {
        muxer.swarm.dial(muxer.swarm.peerInfo, "/echo/1.0.0", (err, conn) => {
          if (err) throw err
          pull(
            pull.values(sample.slice(0)),
            conn,
            pull.onEnd(() => d.resolve())
          )
        })
      }, {
        defer: true
      }), suite)
      .on('cycle', function (event) {
        console.log(String(event.target))
      })
      .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').map('name'))
        process.exit(0)
      })
      // run async
      .run({
        'async': true
      })
  })

})
