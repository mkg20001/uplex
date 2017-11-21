"use strict"

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const assert = require("assert")

const pull = require("pull-stream")
const uplex = require("../")
const queue = require("pull-queue")
const duplex = () => queue((end, data, cb) => process.nextTick(() => cb(end, data)))
const duplex2 = () => {
  const a = duplex()
  const b = duplex()
  return [{
    source: a.source,
    sink: b.sink
  },{
    source: b.source,
    sink: a.sink
  }]
}

const setup = cb => {
  const [conn, conn2] = duplex2()
  const m1 = uplex(conn)
  const m2 = uplex(conn2)
  const data_conn = m1.createConnection()
  m2.once("conn", conn => {
    cb(data_conn, conn)
  })
}

describe("µplex", () => {
  it("should correctly transmit the data", cb => {
    setup((from,to) => {
      const v = [Buffer.from("HELLO W0RLD")]
      pull(
        pull.values(v),
        from,
        pull.drain()
      )
      pull(
        pull.values([]),
        to,
        pull.collect((err, res) => {
          expect(err).to.not.exist()
          assert.deepEqual(res, v)
          cb()
        })
      )
    })
  })
  it("should correctly recieve the data", cb => {
    setup((from,to) => {
      const v = [Buffer.from("HELLO W0RLD")]
      pull(
        pull.values(v),
        to,
        pull.drain()
      )
      pull(
        pull.values([]),
        from,
        pull.collect((err, res) => {
          expect(err).to.not.exist()
          assert.deepEqual(res, v)
          cb()
        })
      )
    })
  })
  it("should correctly send data back and forth", cb => {
    setup((from,to) => {
      const v = [Buffer.from("HELLO W0RLD")]
      const v2 = [Buffer.from("H0W AR3 Y0U")]
      pull(
        pull.values(v),
        from,
        pull.collect((err, res) => {
          expect(err).to.not.exist()
          assert.deepEqual(res, v2)
        })
      )
      pull(
        pull.values(v2),
        to,
        pull.collect((err, res) => {
          expect(err).to.not.exist()
          assert.deepEqual(res, v)
          cb()
        })
      )
    })
  })
})
