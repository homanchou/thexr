defmodule ThexrWeb.Space.GrandSupervisor do
  use DynamicSupervisor

  # alias Thexr.SpaceServer

  def start_link(_arg) do
    DynamicSupervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_space(space_id) do
    DynamicSupervisor.start_child(__MODULE__, {ThexrWeb.Space.Supervisor, space_id})
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

  def stop_space(pid) do
    DynamicSupervisor.terminate_child(__MODULE__, pid)
  end
end
