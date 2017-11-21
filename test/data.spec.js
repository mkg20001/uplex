"use strict"

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

describe("µplex", () => {
  it("moves data arround", cb => {
    /*const m1 = uplex({
      sink: pull.log(),
      source: () => {}
    })*/
    const [conn, conn2] = duplex2()
    const m1 = uplex(conn)
    const m2 = uplex(conn2)
    const data_conn = m1.createConnection()
    const val = [Buffer.from("HELLO W0RLD")]
    pull(
      pull.values(val),
      data_conn,
      pull.drain()
    )
    m2.once("new_conn", conn => {
      pull(
        pull.values([]),
        conn,
        pull.collect((err, res) => {
          if (err) return cb(err)
          console.log(res)
        })
      )
    })
  })
})
