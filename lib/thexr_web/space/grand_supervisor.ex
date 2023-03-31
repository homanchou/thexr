defmodule ThexrWeb.Space.GrandSupervisor do
  use DynamicSupervisor

  # alias Thexr.SpaceServer

  def start_link(_arg) do
    DynamicSupervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_space_supervisor(space_id) do
    case DynamicSupervisor.start_child(__MODULE__, {ThexrWeb.Space.Supervisor, space_id}) do
      {:ok, pid} ->
        # DynamicSupervisor.start_child(pid, {SpaceServer, space})
        DynamicSupervisor.start_child(pid, {ThexrWeb.Space.Server, space_id})
        DynamicSupervisor.start_child(pid, {ThexrWeb.Space.Membership, space_id})
    end
  end

  # def start_space(space = %Thexr.Spaces.Space{}) do
  #   DynamicSupervisor.start_child(__MODULE__, {SpaceServer, space})
  # end

  # def start_space(space_id) do
  #   case Thexr.Spaces.get_space(space_id) do
  #     nil -> {:error, :not_found}
  #     space -> DynamicSupervisor.start_child(__MODULE__, {SpaceServer, space})
  #   end
  # end

  # def stop_space(space_id) do
  #   child_pid = Thexr.SpaceServer.pid(space_id)

  #   if child_pid != nil do
  #     DynamicSupervisor.terminate_child(__MODULE__, child_pid)
  #   end
  # end
end
