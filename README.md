# µPlex

Tiny, fast multiplexer

# Why?

I took a look at current multiplexers and found them to complicated. That's why.

# API
`uplex(conn)`:
  - Creates a new uplex instance
  - `conn`: pull-stream duplex stream
  - Returns `Uplex` muxer

`.createConnection()`
  - Creates a new muxed ready-to-use duplex connection
  - Returns `Duplex`

`.stop(force)`
  - Stops the multiplexer
  - `force`: Boolean to force-close even with open connections
  - Returns `undefined`
  - Throws if there are open connections and `force` is false

`.on('conn', conn => {})`:
  - Event that gets emitted when the other side creates a duplex

# Benchmarks (run `node bench && TINY_CHUNKS=1 node bench`)

Machine used: Ubuntu 16.04 amd64, Node v10.8.0, CPU AMD FX-6300

Big chunks:
```
Muxer#spdy x 8.59 ops/sec ±1.22% (44 runs sampled)
Muxer#mplex x 4.31 ops/sec ±2.11% (15 runs sampled)
Muxer#uplex x 21.78 ops/sec ±1.21% (30 runs sampled)
Fastest is Muxer#uplex
```

Small chunks:
```
Muxer#spdy x 7.52 ops/sec ±2.44% (40 runs sampled)
Muxer#mplex x 4.54 ops/sec ±5.64% (26 runs sampled)
Muxer#uplex x 13.67 ops/sec ±1.24% (65 runs sampled)
Fastest is Muxer#uplex
```
