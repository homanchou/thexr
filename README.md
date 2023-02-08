# Thexr

Make a system - shape

command on component can express: enter, exit, update 

most of the time it's update so you can give a command like this payload 99% of the time

["entity_id", "component_name1", "component_value1", "component_name2", "component_value2"]

if there are NO specific commands for the first introduction of a component, the commands need to be idemponent, for example create an entity which already exists is possible in a noisy network with resends etc.

For all other actions, a special delimiter will be used in the array:

["entity_id", "_DEL_", "component1", "component2"] means delete the component

["entity_id", "component_name1", "component_value1", "_DEL_", "componen2" ] updates and deletes can be combined, though it is rare.

this leaves future expansion of other delimitors for other pairs of data

["entity_id", "component_name1", "component_value1", "_FLASH_", key, value]

a delimitor will be used to delete the entity itself

["entity_id", "_TTL_", 0], on the client this should trigger component deletes for each of the existing components on the entity







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
