# the snapshotters job is to produce an aggregate of the current state of the space
# but it only applies to the environment.
# this way if a new person joins the space, they can get a snapshot of the space
# from the work that this snapshotter does
defmodule ThexrWeb.Space.Snapshotter do
  use GenServer

  @flush_after :timer.seconds(5)

  def start_link(space_id) do
    GenServer.start_link(__MODULE__, space_id)
  end

  def init(space_id) do
    send(self(), :after_init)

    {:ok,
     %{
       space_id: space_id,
       commands: [],
       flush_ref: nil
     }}
  end

  def get_stash(pid) do
    GenServer.call(pid, :get_stash)
  end

  def handle_call(:get_stash, _from, state) do
    {:reply, state.commands, state}
  end

  # ignore the following commands, because they are handled in membership
  def handle_cast({:process_event, %{"tag" => "m"}, _}, state) do
    {:noreply, state}
  end

  # for everything else just stash the command for now
  def handle_cast({:process_event, cmd, _}, state) do
    state =
      case Map.get(state, :flush_ref) do
        nil ->
          Map.put(state, :flush_ref, Process.send_after(self(), :flush_snapshot, @flush_after))

        _ ->
          state
      end

    {:noreply, %{state | commands: [cmd | state.commands]}}
  end

  def handle_info(:flush_snapshot, state) do
    Thexr.Worlds.update_snapshot(
      state.space_id,
      Enum.reverse(state.commands)
    )

    state = Map.put(state, :commands, [])
    state = Map.put(state, :flush_ref, nil)
    {:noreply, state}
  end

  def handle_info(:after_init, state) do
    ThexrWeb.Space.Manager.save_pid(state.space_id, :snapshotter, self())
    {:noreply, state}
  end
end
