# Thexr

problems with crud like schema

if you look at a single message, avatar pose it's fine
but then ttl 0, it might not be specific to you.  you'd need to know if it previously
  had avatar pose

entities that embed a lot of history

A white board that takes hundreds of strokes.  is that an attribute/component of the white board?  or an entity of it's own that has a component associated with the white board?  do you keep these strokes around forever?  or squash them into an image?

- need a leader to optimize ?

space channel receives channe.push(...)

all clients forward them to a single genserver by pid.  That genserver will forward the message to a list of subscribers.

space supervisor - is a standard supervisor, with 2 children in :rest_for_one, 
    if feature supervisor is restarted then only feature supervisor is restarted
    but if manager is restarted, then both manager and feature supervisor will be restarted
  - manager - when starts has an empty map of pids for features
  - feature supervisor - standard supervisor with 3 children,
    - membership, after init will send manager its pid
    - snapshotter
    - journaler
    
all messages go to the manager, which forwards to the features subscribers
when a feature launches it will ping the manager to add it

 that will number sequence the events, timestamp them and then put them into genstage

- movement is so frequent, it has a special message for imoved, but then it doesn't have the same event source record..., avatar pose is the correct event source [ can be made on the server ]

- event sourcing, be able to replay who came and left
   - need a proper "entity joined and entity left" message.
   - presence state and presence diff are for the client, but 
   - [ can be made on the server with every join and terminate ]

- the front end is incapable of saying when user left, so need space channel to do that
  - if doing that... then don't really need phoenix channels


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
