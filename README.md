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

# Benchmarks (run `node bench`)
Small chunks:
```
Muxer#spdy x 8.12 ops/sec ±1.68% (42 runs sampled)
Muxer#multiplex x 6.30 ops/sec ±3.94% (34 runs sampled)
Muxer#uplex x 12.25 ops/sec ±1.18% (34 runs sampled)
Fastest is Muxer#uplex
```

Big chunks:
```
Muxer#spdy x 8.47 ops/sec ±1.89% (43 runs sampled)
Muxer#multiplex x 6.19 ops/sec ±2.08% (12 runs sampled)
Muxer#uplex x 22.00 ops/sec ±26.48% (9 runs sampled)
Fastest is Muxer#uplex
```
