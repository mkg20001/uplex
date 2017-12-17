'use strict'

const EE = require('events').EventEmitter
const uplex = require('../src')
const Connection = require('interface-connection').Connection
const setImmediate = require('async/setImmediate')
const noop = () => {}

class UplexMuxer extends EE {
  constructor (conn) {
    super()
    this.uplex = uplex(conn)
    this.raw = conn

    this.uplex.on('conn', new_conn => this.emit('stream', new Connection(new_conn, conn)))
  }

  newStream (cb) {
    cb = cb || noop
    const conn = new Connection(this.uplex.createConnection(), this.raw)
    setImmediate(() => cb(null, conn))
    return conn
  }

  end (cb) {
    cb = cb || noop
    this.uplex.stop()
  }
}

const muxer = (conn /*, isListener */) => new UplexMuxer(conn)
module.exports = {
  dialer: muxer,
  listener: muxer,
  multicodec: '/uplex/1.0.0'
}
