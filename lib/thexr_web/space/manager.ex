defmodule ThexrWeb.Space.Manager do
  use GenServer, restart: :transient

  import Thexr.Registry, only: [via_tuple: 2]

  @timeout :timer.minutes(5)

  def start_link([space_id, sup_pid]) do
    GenServer.start_link(__MODULE__, {:ok, sup_pid}, name: via_tuple(:manager, space_id))
  end

  def get_pid(space_id) do
    Thexr.Registry.whereis(:manager, space_id)
  end

  def get_snapshot(space_id) do
    persisted = Thexr.Worlds.get_entities(space_id)
    state = get_pid(space_id) |> :sys.get_state()
    commands = ThexrWeb.Space.Snapshotter.get_stash(state.snapshotter)
    Thexr.Worlds.update_snapshot(persisted, commands)
  end

  def get_poses(pid) do
    GenServer.call(pid, :get_poses)
  end

  def init({:ok, sup_pid}) do
    {:ok, %{membership: nil, snapshotter: nil, journaler: nil, reflector: nil, sup_pid: sup_pid}}
  end

  def process_event(pid, event, channel_pid) when is_pid(pid) do
    GenServer.cast(pid, {:process_event, event, channel_pid})
  end

  def process_event(space_id, event, channel_pid) do
    case Thexr.Registry.whereis(:manager, space_id) do
      nil ->
        {:error, :no_pid}

      pid ->
        process_event(pid, event, channel_pid)
    end
  end

  def save_pid(space_id, key, pid) do
    GenServer.cast(via_tuple(:manager, space_id), {:save_pid, key, pid})
  end

  def state(space_id) do
    GenServer.call(via_tuple(:manager, space_id), :state)
  end

  # def start_children(space_supervisor_pid, space_id) do
  #   IO.inspect("in start children")
  #   GenServer.cast(__MODULE__, {:start_children, space_supervisor_pid, space_id})
  # end

  def handle_call(:state, _from, state) do
    {:reply, state, state}
  end

  def handle_call(:get_poses, _from, state) do
    membership_pid = state.membership
    poses = ThexrWeb.Space.Membership.active_poses(membership_pid)

    {:reply, poses, state}
  end

  def handle_cast({:process_event, cmd, channel_pid}, state) do
    dispatch_reflector(cmd, channel_pid, state.reflector)
    dispatch_membership(cmd, channel_pid, state.membership)
    dispatch_snapshotter(cmd, state.snapshotter)
    dispatch_journaler(cmd, state.journaler)
    # for {_k, v} <- state do
    #   GenServer.cast(v, {:process_event, cmd, channel_pid})
    # end

    # Enum.each(state, fn {k, v} -> nil end)
    # if channel_pid == nil do
    #   ThexrWeb.Endpoint.broadcast("space:#{state.space_id}", "stoc", cmd)
    # else
    #   ThexrWeb.Endpoint.broadcast_from(channel_pid, "space:#{state.space_id}", "stoc", cmd)
    # end

    # TODO,
    # 1. save history of events
    # IO.inspect(cmd, label: "received event")
    # ThexrWeb.Endpoint.broadcast_from(pid, )
    # 2. create projection
    {:noreply, state, @timeout}
  end

  def handle_cast({:save_pid, key, pid}, state) do
    state = %{state | key => pid}
    {:noreply, state}
  end

  def handle_info(:timeout, state) do
    IO.inspect("space timed out, shutting it down")
    ThexrWeb.Space.GrandSupervisor.stop_space(state.sup_pid)
    {:stop, :timeout, state}
  end

  def dispatch_reflector(cmd, from, to) do
    GenServer.cast(to, {:process_event, cmd, from})
  end

  def dispatch_membership(cmd, from, to) do
    GenServer.cast(to, {:process_event, cmd, from})
  end

  def dispatch_snapshotter(cmd, to) do
    GenServer.cast(to, {:process_event, cmd, nil})
  end

  def dispatch_journaler(cmd, to) do
  end
end
