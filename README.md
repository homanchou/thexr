# Thexr

Do this next: 

customizable spaces / create games using rules
- create your entities 
- and components with behavior
    event + condition => effect (set new variables in the world: data) + animation + sound
    
  object events: clicked (pointed at), hovered over, held, pressed, thrown, released, visited,
    - landed, collided, punched, held+triggerdown, held+trigger continuous
    - make primitive library of switches, guns, sensors
    - you can build primitive cause and effect with them
  
  rules: on (event) -> (if entity, component.value > | < | == >) -> add, remove, update component
    - library of useful components: 

  systems -> process each component and entity they are interested in, and create side effects
  

- set properties to the world (ecs) -> queue for export and mark change
- state for export -> to sync with clients (every 50-100ms) -> serialize to json
- import properties (other's changed) from external clients (every 5-100ms) -> stash in world -> mark change
- on each frame, if something changed in the world (TM), process systems pipeline
   - go through each system in order: and process each of: on particular components it is interested in: enters, exits, changes

   0. have local object that describes a world at time N with entities and components. this is a current snapshot of the world, like positions, rotations, scale, color, transarency of meshes, and is continuously updated like a single frame in a film strip.  It can also contain data enables interactions, such as whether the object can be picked up, whether it can block movement like a wall, whether it can be collected, whether gravity is applied to it.  These kinds of data are like flags or key/value pair configuration that enable scripts called systems to act on them when events happen.  Just about any kind of data can be stored on the entities, and be interpretted by the systems in a multitude of ways, but the rule of thumb is that the experience on all clients, whether having been there from the start or just joining now, should have the same experience.  So TIME is an important aspect of components that it's assumed they can be applied NOW.  For example an impulse component with a direction is a one time force applied to an object.  suppose you only meant for the impulse to be applied the very moment the component is entered.  That would mean that it would need to be removed immediately because it's not supposed to be constantly applied.  In general, the actor that applied the change to the entity has some ownership or responsiblity to remove the impulse.  This can be done in a second update or by including a REDIS style expiration to the component which the clients will automatically remove in time.  Bullets can also be automatically cleaned up in each respective client once they complete their animation or hit a target.  These are common component or entity life-cycle hooks.

   entity-created, [life_cycle: delete_on_collide]  

   most player movement, will by synced every 50-100ms.  at 100ms that 10 fps, slower than animating on the 2's.  but interpolated.  But if you have a bullet going in a straight line, even if you interpolated it to the spots in the path, it might not be a smooth journey.  A bullet path, we know where it will go in the future

   if you want to send over an animation sequence to play on the other side, we can send a batch of instructions and a current timestamp to start playing.  For example: "here are keyframes" and start the animation at T0 and end the animation at T1.  That way when a new user picks up the state, they can interpolate the current frame of animation using their own timestamp, and not play locally.  The initiating party can also send over position, and rotation, adjustment "fixes" to sync all animations, for example a bomb component can have the initial parameters for the impulse, position, radius etc.  It also needs a time for when the bomb went off.  If a client is within a second of that timestamp they can also do the rpc to execute the bomb

   1. on incoming changes -> looks like an object patch that will be merged into the local object -> check with existing state, and mark which components have entered or exited and call system pipeline to have each system have a chance (in order) to process the entity, providing each system with the full components of the entity as well as which components entered or exited or were updated.  Each system will quickly run it's run function given the entity and components and enter and exit, update flags.  Based on these flags, the system will determine whether it is interested in the message or ignore it.
   2. local events that come from this client user interaction, (e.g. controller movement, grab, throw, point etc ) if these events should have consequences to the shared definition of the world stash them in an outgoing object, sync them with everyone and self buffered every 50ms.  Should not have a much difference as long as the local simulation that is running frame by frame, like arm movements are not relying on buffered messages.
   3. to compensate for buffered messages, we just don't draw our own avatar.  we hid it, and render our own hand movements locally just for ourselves, which don't require per frame syncing to others.


    




- send identity
  - make identity using session
  - use in channel using authentication

- use unique_id as entity_id and add to the scene


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
