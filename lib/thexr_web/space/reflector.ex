# a reflectors job is to broadcast incoming events about a space
# to all the other connected browsers in realtime
# an optimization is to batch up user movement events and send them all at once
# on a set timer - this is done in the membership feature
defmodule ThexrWeb.Space.Reflector do
  use GenServer, restart: :transient

  def start_link(space_id) do
    GenServer.start_link(__MODULE__, space_id)
  end

  #################################################################
  # Server Callbacks
  #################################################################

  def init(space_id) do
    send(self(), :after_init)
    {:ok, %{space_id: space_id}}
  end

  # optimization, reflector reflects everything except
  # movement because there is a ton of them and we
  # can batch them instead
  def handle_cast({:process_event, %{"set" => %{"avatar_pose" => _}}, _}, state) do
    {:noreply, state}
  end

  def handle_cast({:process_event, cmd, channel_pid}, state) do
    if channel_pid == nil do
      ThexrWeb.Endpoint.broadcast("space:#{state.space_id}", "stoc", cmd)
    else
      ThexrWeb.Endpoint.broadcast_from(channel_pid, "space:#{state.space_id}", "stoc", cmd)
    end

    # TODO,
    # 1. save history of events
    # ThexrWeb.Endpoint.broadcast_from(pid, )
    # 2. create projection
    {:noreply, state}
  end

  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  def handle_info(:after_init, state) do
    ThexrWeb.Space.Manager.save_pid(state.space_id, :reflector, self())
    {:noreply, state}
  end
end
