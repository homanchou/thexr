defmodule ThexrWeb.Space.FeatureSupervisor do
  use Supervisor

  def start_link(space_id) do
    Supervisor.start_link(__MODULE__, space_id)
  end

  def init(space_id) do
    children = [
      {ThexrWeb.Space.Membership, space_id},
      {ThexrWeb.Space.Reflector, space_id},
      {ThexrWeb.Space.Snapshotter, space_id},
      {ThexrWeb.Space.Journaler, space_id}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
