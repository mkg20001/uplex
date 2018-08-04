'use strict'

const EE = require('events').EventEmitter

const pull = require('pull-stream')

const delta = (a, b) => a > b ? a - b : b - a
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
const debug = require('debug')
const log = debug('uplex')

const looper = require('pull-looper')

const MAX_32 = Math.pow(2, 32) - 1

const Pushable = require('pull-pushable')

class Queue extends EE {
  constructor () {
    super()
    this.q = []
  }
  _handle (cb, data) {
    cb(data)
  }
  get (cb) {
    const q = this.q
    if (q.length) return this._handle(cb, this.q.shift())
    else this.once('data', () => this._handle(cb, this.q.shift()))
  }
  push (data) {
    this.q.push(data)
    this.emit('data')
  }
}

class DataQueue extends Queue {
  constructor () {
    super()
    this.q = []
  }
  _handle (cb, data) {
    cb(data.end, data.data)
  }
  get (end, cb) {
    const q = this.q
    if (end) return cb(end) // TODO: cleanup on end. TODO: handle reverse sink (aka abort the source)
    if (q.length) return this._handle(cb, this.q.shift())
    else this.once('data', () => this._handle(cb, this.q.shift()))
  }
  push (end, data) {
    this.q.push({
      end,
      data
    })
    this.emit('data')
  }
}

class SourceConn {
  constructor (state, id) {
    this.state = state
    this.id = id
    this.q = new DataQueue()
    this.source = this.q.get.bind(this.q)
    state._listen(id, this.q.push.bind(this.q))

    log('creating source', this.id)
  }
}

class SinkConn {
  constructor (state, id) {
    this.state = state
    this.id = id
    this.sink = this.sink.bind(this)

    log('creating sink', this.id)
  }
  sink (read) {
    const next = (end, data) => {
      this.state._emit(this.id, end, data)
      if (end) return
      read(null, next)
    }
    read(null, next)
  }
}

class DuplexConn {
  constructor (state, id, inv) {
    this.state = state
    this.id = id
    this.idSource = id + (inv ? 2 : 1)
    this.idSink = id + (inv ? 1 : 2)

    log('creating duplex', this.id)

    this._source = new SourceConn(state, this.idSource)
    this._sink = new SinkConn(state, this.idSink)

    this.source = pull(
      this._source.source.bind(this),
      looper
    )
    this.sink = pull(
      // TODO: add chunker here
      looper,
      this._sink.sink.bind(this)
    )
  }
}

class Uplex extends EE {
  constructor () {
    super()

    this.id = rand(1, MAX_32)

    this.uid = rand(1000, 9999)

    this.listen = {}

    this.source = Pushable()
    this._push = this.source.push.bind(this.source)

    this.sink = read => {
      let msg
      let cached = Buffer.allocUnsafe(0)
      const next = (end, data) => {
        if (end) return
        if (cached.length) data = Buffer.concat([cached, data])
        let decoded = []
        while (data && data.length) {
          if (!msg) msg = {s: 0}
          switch (msg.s) {
            case 0:
              msg.state = data.readUInt8(0)
              data = data.slice(1)
              msg.s++
              break
            case 1:
              if (data.length < 8) {
                cached = data
                data = null
                break
              }
              msg.id = data.readUInt32BE(0)
              data = data.slice(8)
              if (!msg.state) {
                msg.s++
              } else {
                decoded.push(msg)
                msg = null
              }
              break
            case 2:
              if (data.length < 8) {
                cached = data
                data = null
                break
              }
              msg.dlen = data.readUInt32BE(0)
              data = data.slice(8)
              if (msg.dlen) {
                msg.s++
              } else {
                msg.data = Buffer.allocUnsafe(0)
                decoded.push(msg)
                msg = null
              }
              break
            case 3:
              if (data.length < msg.dlen) {
                cached = data
                data = null
                break
              }
              msg.data = data.slice(0, msg.dlen)
              data = data.slice(msg.dlen)
              decoded.push(msg)
              msg = null
              break
            default: throw new Error('Parser Error')
          }
        }
        decoded.forEach((msg) => this.handle(msg))
        read(null, next)
      }
      read(null, next)
    }
  }
  handle (msg) {
    if (msg) {
      switch (msg.state) {
        case 0x00: // data event
          this._localEmit(msg.id, null, msg.data)
          break
        case 0x01: // duplex event
          log('accepting duplex', msg.id)

          this.emit('conn', new DuplexConn(this, msg.id, true))

          while (delta(msg.id, this.id) < 100000) {
            log('WARN', 'increasing id seed to avoid collision (delta(theirs, ours) < 100000)')
            this.id = rand(1, MAX_32)
          }
          break
        case 0x02: // end event
          this._localEmit(msg.id, true, null)
          break
        default:
          log('WARN: Unknown state 0x%s sent', msg.state.toString(16))
      }
    }
  }
  _emit (id, end, data) {
    if (end) this.pushOut(id, 0x02, data)
    else this.pushOut(id, 0x00, data)
  }
  _listen (id, cb) {
    log('listen', id)
    this.listen[id] = cb
  }
  _localEmit (id, ...args) {
    if (!this.listen[id]) return this.panic('Socket ' + id + " isn't being listenened on!")
    this.listen[id](...args)
  }

  createConnection () {
    const conn = new DuplexConn(this, this.id)
    this.pushOut(this.id, 0x01)
    log('sending duplex', this.id)
    this.id += 3
    return conn
  }

  pushOut (id, state, data) {
    let msg = Buffer.allocUnsafe(9)
    msg.writeUInt8(state, 0)
    msg.writeUInt32BE(id, 1)
    if (data) {
      let len = Buffer.allocUnsafe(8)
      len.writeUInt32BE(data.length)
      this._push(Buffer.concat([msg, len, data]))
    } else {
      this._push(msg)
    }
  }
}

module.exports = (conn) => {
  const uplex = new Uplex()

  pull(
    conn,
    uplex,
    conn
  )

  return uplex
}
