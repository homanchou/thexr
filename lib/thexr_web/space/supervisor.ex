defmodule ThexrWeb.Space.Supervisor do
  use Supervisor

  def start_link(space_id) do
    Supervisor.start_link(__MODULE__, space_id)
  end

  def init(space_id) do
    children = [
      {ThexrWeb.Space.Manager, [space_id, self()]},
      {ThexrWeb.Space.FeatureSupervisor, space_id}
    ]

    Supervisor.init(children, strategy: :rest_for_one)
  end
end
