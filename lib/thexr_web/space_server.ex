defmodule ThexrWeb.SpaceServer do
  use GenServer, restart: :transient

  @timeout :timer.minutes(5)

  def start_link(space_id) do
    GenServer.start_link(__MODULE__, space_id)
  end

  def state(space_id) do
    GenServer.call({:via, :swarm, space_id}, :get_state)
  end

  #################################################################
  # Server Callbacks
  #################################################################

  def init(space_id) do
    send(self(), :after_init)
    {:ok, %{space_id: space_id}}
  end

  def handle_call(:get_state, _from, state) do
    {:reply, state, state, @timeout}
  end

  def handle_info(:after_init, state) do
    ets_ref =
      :ets.new(:member_movements, [
        :set,
        :public,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ])

    state = Map.put(state, :ets_ref, ets_ref)

    {:noreply, state, @timeout}
  end
end
