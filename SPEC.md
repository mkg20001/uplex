# Packets

## ID = Unique ID number (int64)

If one side issues a creation request (0x01) and the delta between the current id seed and the request id is less than 100,000 than the id seed is regenerated.

## State =
 ID  | Description
 --- | --------------------------------
0x00 | Data event emit(id, null, this)
0x01 | Initialise a new duplex
0x02 | End event emit(id, true, null)

## Data = Bytes

This field is optional for all states except 0x00
