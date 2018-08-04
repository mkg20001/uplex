'use strict'

/* eslint-disable no-console */

const Benchmark = require('benchmark')
const pull = require('pull-stream')
const PeerInfo = require('peer-info')

const Libp2p = require('libp2p')

const TCP = require('libp2p-tcp')

const SPDY = require('libp2p-spdy')
const MPLEX = require('libp2p-mplex')
const UPLEX = require('../libp2p')

const {map} = require('async')
const PeerId = require('peer-id')

let suite = new Benchmark.Suite()

const sample = process.env.TINY_CHUNKS ? '.'.repeat(100).split('').map(() => Buffer.from('HELLO')) : [Buffer.from('HELLO'.repeat(10000))]

map(require('../test/ids.json'), PeerId.createFromJSON, (e, ids) => {
  if (e) throw e

  let port = 8670

  const createLibp2pNode = ({muxer, name}, id, cb) => {
    const pi = new PeerInfo(ids[id])
    pi.multiaddrs.add('/ip4/127.0.0.1/tcp/' + port++)
    const swarm = new Libp2p({
      peerInfo: pi,
      modules: {
        transport: [TCP],
        streamMuxer: [muxer],
        connEncryption: []
      }
    })
    swarm.handle('/echo/1.0.0', (proto, conn) => pull(conn, conn))
    swarm.handle('/blackhole/1.0.0', (proto, conn) => pull(pull.values([]), conn, pull.drain()))
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
    name: 'spdy',
    muxer: SPDY
  }, {
    name: 'mplex',
    muxer: MPLEX
  }, {
    name: 'uplex',
    muxer: UPLEX
  }], (mux, cb) => map([0, 1], (id, cb) => createLibp2pNode(mux, id, cb), cb), (err, muxers) => {
    if (err) throw err
    muxers
      .reduce((suite, muxer) => suite.add('Muxer#' + muxer[0].name, d => {
        muxer[0].swarm.dialProtocol(muxer[1].swarm.peerInfo, '/echo/1.0.0', (err, conn) => {
          if (err) throw err
          pull(
            pull.values(sample.slice(0)),
            conn,
            pull.onEnd(() => d.resolve()) // eslint-disable-line max-nested-callbacks
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
        async: true
      })
  })
})
