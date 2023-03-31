defmodule ThexrWeb.Space.Supervisor do
  use DynamicSupervisor

  import Thexr.Registry, only: [via_tuple: 2]

  def start_link(space_id) do
    DynamicSupervisor.start_link(__MODULE__, space_id, name: via_tuple(:supervisor, space_id))
  end

  def init(_space_id) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  # def start_membership(pid, space_id) when is_pid(pid) do
  #   IO.inspect("attempting to start #{NaiveDateTime.utc_now()}")
  #   DynamicSupervisor.start_child(pid, {ThexrWeb.Space.Membership, space_id})
  # end
end
