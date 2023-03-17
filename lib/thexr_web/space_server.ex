defmodule ThexrWeb.SpaceServer do
  use GenServer, restart: :transient

  @timeout :timer.minutes(10)

  def start_link(space_id) do
    GenServer.start_link(__MODULE__, space_id)
  end

  def state(space_id) do
    GenServer.call({:via, :swarm, space_id}, :get_state)
  end

  def process_event(space_id, event, channel_pid) do
    GenServer.cast({:via, :swarm, space_id}, {:process_event, event, channel_pid})
  end

  #################################################################
  # Server Callbacks
  #################################################################

  def init(space_id) do
    send(self(), :after_init)
    {:ok, %{space_id: space_id}}
  end

  def handle_cast({:process_event, cmd, channel_pid}, state) do
    if channel_pid == nil do
      ThexrWeb.Endpoint.broadcast("space:#{state.space_id}", "stoc", cmd)
    else
      ThexrWeb.Endpoint.broadcast_from(channel_pid, "space:#{state.space_id}", "stoc", cmd)
    end

    # TODO,
    # 1. save history of events
    IO.inspect(cmd, label: "received event")
    # ThexrWeb.Endpoint.broadcast_from(pid, )
    # 2. create projection
    {:noreply, state, @timeout}
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
