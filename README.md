# Thexr

We do need to "see" each other in VR.

A box for head and hands doesn't cut it.  We want to see a whole body.

The problem is we don't have data for any other part.

We can guess.  Left heel, right heel, right shoulder, left shoulder, left hip, right hip...

Create a list of landmarks with coordinates relative to the coordinates we get from head and hands.

This estimation all happens client-side to reduce the network data being transmitted.  Unless the person is augmenting the data by wearing body pose detection, which can be sent into the space simultaneously.

We can probably achieve something close just with some programatic rules.  The distance of hands to head, distance from all 3 to floor, and tell us weither the hands are outstretched or if we are croutching or laying down.

These rules (MIGHT) improve more, if we had ML learn the function between input of floor, head and hand positions, and output, all the body landmarks.

This estimation has some issues when it is wrong though.  Elbows pointing the wrong way, sliding foundation/feet/seat.  popping/glitching body parts when the estimation of a part doesn't have high confidence.  body intersecting with the floor or couch (estimation not taking env into consideration).

====

what do we want to achieve?  make something special, that VRchat doesn't do?  that is fun and expressive.

make it loose.  Make it graphic.  make it light weight.

paramatizable universal body model?
animation?
mesh?






A person is represented by: 
  A simulation of a body.  Something you can see.
  Something you can interact with (vibrate controllers when you touch)
  or vibrate your controllers when being touched

  it does not need to be a continous mesh.  

  Mesh
    Pro:
    
    Traditional pipeline
    can allow users to upload their own meshes
    look pretty good, especially when textured
    once you have an animation loaded they deform pretty well
    gives users a lot of freedom

    Con:

    The assets are quite large.  It could easily break the platform if allowing people to upload unvetted models and textures.

    Even if you use a controlled custom mesh, varying the morph targets is laborious and still space consuming since you deform the entire face mesh for a few keyposes visemes and emotions.

    Bringing new animations in there is also laborious and hard to do.  You currently need blender and mixamo and the animations are fixed.

    The pipeline is rather restrictive, perhaps it's more fun to do something else like texture map a video for emotions instead of face morphs.


  Non-Mesh;

   Instead of deforming a mesh with bones.  Have a body prediction, algorithm that predicts the position of certain land marks.  As these
   predictions (that make up a pose), (you can even have the name of a clip -> sequence of poses) be the input to an avatar and the engine will render a body matching and animating to the pose.

   saves space by not having customized meshes, but instead scaled limbs like hands, forearms, biceps, torsos, legs, feet.  All wearables are also just interchangable parts, so if wearing pants, just change out the crotch and leg meshes, or decal a shirt on top of a torso.  Much easier to create simple variations without requiring external software.

   There are no deformations, no skeleton and no binding, and no morph targets.  The face will be decals for eyes, mouth, eyebrows.  The arms will have a scripted placement based on hand to shoulder prediction.  The torso might bend but we can just have that be a scripted parameter based on shoulder and predicted hip placement.  Legs can use some hints from full body detection or just be rag doll that users or self can place in the scene, to override prediction.





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
    As people paint brush strokes, we use cmd {eid: "white_board", push: {name: "strokes" value: any}}
    "push" will imply that it's adding a new value into a list on the snapshot, but the message will only contain the new element.
    
    in the snapshot:

    id: "white_board", components: %{ "container_name" => [v1, v2, v3...]}

    keeps appending new strokes to the list.

    A late comer will get a snapshot that includes all deltas and play all strokes on the empty canvas

    The leader will, on the 101th stroke, send a new command: {eid: "", set: {strokes: [], canvas: "base64....." }}, deleting all previous strokes and compressing data to the canvas.

    idea: use pop command to undo last stroke

  sequencer
    -> base is 2 dimensional array of 40 by 16 zeros.  The sequencer state can get quite big if sending all the state of all the buttons.  Instead you can send the coordinate of the value in the array you want to update.  
   
    eid: "sequencer", index_set: { offset: 25, value: any }

    index_set will update an index at the 25th position in the array.  If you have a 2 dimensional array, or x dimensional array you'll need to calculate the offset to update the right position.

    A late comer will get the entire state of the sequencer.  Any existing users will just get the diffs.



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
