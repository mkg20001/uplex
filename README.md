# µPlex

Tiny, fast multiplexer

# Why?

Currently multiplexers have a lot of code that is used for chunking and other operations.
But most apps today have a layer of encryption above them.
So the Internet Protocol doesn't care whether you chunk your stuff or not.
And crypto protects you from MITM attacks so checksums are also unnecesarry.
Additionally for some reason the server can't open sockets via the multiplexer, only the client.

So... why not make a simple pull-stream first, protocol-buffers, double-side multiplexer

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
Big chunks:
```
Muxer#spdy x 8.45 ops/sec ±1.78% (43 runs sampled)
Muxer#multiplex x 6.17 ops/sec ±2.05% (12 runs sampled)
Muxer#uplex x 22.30 ops/sec ±23.97% (10 runs sampled)
Fastest is Muxer#uplex
```

Small chunks:
```
Muxer#spdy x 8.00 ops/sec ±2.29% (41 runs sampled)
Muxer#multiplex x 6.26 ops/sec ±4.13% (34 runs sampled)
Muxer#uplex x 12.29 ops/sec ±0.93% (34 runs sampled)
Fastest is Muxer#uplex
```
