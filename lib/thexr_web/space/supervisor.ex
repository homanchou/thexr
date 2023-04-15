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

    # IO.inspect("in init")
    # ThexrWeb.Space.Manager.start_children(self(), space_id)
    # DynamicSupervisor.init(strategy: :one_for_one)
  end

  # def start_membership(pid, space_id) when is_pid(pid) do
  #   IO.inspect("attempting to start #{NaiveDateTime.utc_now()}")
  #   DynamicSupervisor.start_child(pid, {ThexrWeb.Space.Membership, space_id})
  # end
end
