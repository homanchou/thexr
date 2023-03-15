# Thexr

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
