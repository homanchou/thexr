# Thexr

Problem with sequencer and also whiteboard
  -> A. DELTA: msg msg should be small like a delta (just the brush stroke or diff)
  -> B. FULL state of thing: else msg is the entire new mesh, sequence or image

Fast realtime changes:
  -> A. easy for front end
  -> B. easy for front end (could be slow for large canvas, sequences)
Full snap shot of state can be saved:
  -> A. hard for backend to know what to do with custom msg
  -> B. easy for backend, just replace with data

Best of both worlds is a hybrid approach:
  -> keep an array of deltas that can be replayed on a previous snapshot
     the array is also part of the state
  -> the leader will flush deltas into a new snapshot and create a new set event
     periodically when there are too many deltas

Example:
  white board
    -> base is blank white or off white canvas
    -> delta is empty array
    As people paint brush strokes, we use cmd {eid: "", push: {name: "", value: ""}}
    When front end receives message it will draw a new stroke.

    A late comer will get a snapshot that includes all deltas and play all strokes on the empty canvas

    The leader will, on the 101th stroke, send a new command: {eid: "", set: {strokes: [], canvas: "base64....." }}, deleting all previous strokes and compressing data to the canvas.

    use pop command to undo

  sequencer
    -> base is 2 dimensional array of 40 by 16 zeros.


  3d painting

===
  -> A. good for those in the scene, only front end needs to know how to interpret reflected msg
  -> B. msg is massive, and although straight forward to parse, is 

To start your Phoenix server:

  * Install dependencies with `mix deps.get`
  * For dev, run docker-compose up -d (with docker running)
  * Create and migrate your database with `mix ecto.setup`
  * Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Learn more

  * Official website: https://www.phoenixframework.org/
  * Guides: https://hexdocs.pm/phoenix/overview.html
  * Docs: https://hexdocs.pm/phoenix
  * Forum: https://elixirforum.com/c/phoenix-forum
  * Source: https://github.com/phoenixframework/phoenix
