# Packets

ID = Unique ID number

State =
--------
0x00 | Data event emit(id, null, this)
0x01 | Initialise a new duplex
0x02 | End event emit(id, true, null)
--------

Data = Bytes
