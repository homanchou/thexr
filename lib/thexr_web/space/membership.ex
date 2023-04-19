defmodule ThexrWeb.Space.Membership do
  use GenServer, restart: :transient

  @kick_check_timeout :timer.seconds(15)
  @interval 50

  def start_link(space_id) do
    GenServer.start_link(__MODULE__, space_id)
  end

  def get_state(pid) do
    GenServer.call(pid, :get_state)
  end

  def active_members(pid) do
    GenServer.call(pid, :get_active_members)
  end

  # def member_joined(pid, member_id) do
  #   GenServer.cast(pid, {:member_joined, member_id})
  # end

  # def member_left(pid, member_id) do
  #   GenServer.cast(pid, {:member_left, member_id})
  # end

  # def member_moved(pid, member_id, pose) do
  #   GenServer.cast(pid, {:member_moved, member_id, pose})
  # end

  #################################################################
  # Server Callbacks
  #################################################################

  def init(space_id) do
    send(self(), :after_init)
    {:ok, %{space_id: space_id, disconnected: %{}, members: %{}, ref: nil, should_sync: false}}
  end

  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  def handle_call(:get_active_members, _from, state) do
    active_members = Map.drop(state.members, Map.keys(state.disconnected))

    {:reply, active_members, state}
  end

  # member moved so
  def handle_cast(
        {:process_event, %{"set" => %{"avatar_pose" => _}} = cmd, _from},
        state
      ) do
    state = %{state | members: Thexr.Worlds.update_snapshot(state.members, [cmd])}

    state =
      case state.ref do
        nil ->
          ref = Process.send_after(self(), :broadcast_all_member_poses, @interval)
          %{state | ref: ref}

        _ ->
          state
      end

    {:noreply, %{state | should_sync: true}}
  end

  # someone came back, so remove the disconnection
  def handle_cast(
        {:process_event, %{"eid" => member_id, "set" => %{"avatar" => _}} = cmd, _from},
        state
      ) do
    state = %{state | members: Thexr.Worlds.update_snapshot(state.members, [cmd])}

    case Map.pop(state.disconnected, member_id) do
      {nil, _prev_disconnected} ->
        {:noreply, state}

      {ref, new_disconnected} ->
        Process.cancel_timer(ref)
        {:noreply, %{state | disconnected: new_disconnected}}
    end
  end

  def handle_cast(
        {:process_event, %{"eid" => member_id, "ttl" => _, "tag" => "m"} = cmd, _},
        state
      ) do
    # here, we don't want to delete it just yet because they might just be refreshing their tab
    # state = %{state | members: Thexr.Worlds.update_snapshot(state.members, [cmd])}

    ref = Process.send_after(self(), {:kick_check, member_id}, @kick_check_timeout)
    new_disconnected = Map.put(state.disconnected, member_id, ref)
    {:noreply, %{state | disconnected: new_disconnected}}
  end

  # mic or any other components changes on a member
  def handle_cast({:process_event, %{"tag" => "m"} = cmd, _}, state) do
    state = %{state | members: Thexr.Worlds.update_snapshot(state.members, [cmd])}
    {:noreply, state}
  end

  def handle_cast({:process_event, _, _}, state) do
    {:noreply, state}
  end

  def handle_info(:after_init, state) do
    ThexrWeb.Space.Manager.save_pid(state.space_id, :membership, self())
    {:noreply, state}
  end

  def handle_info(:broadcast_all_member_poses, %{should_sync: true} = state) do
    movements =
      Enum.reduce(state.members, %{}, fn {member_id, components}, acc ->
        Map.put(acc, member_id, Map.get(components, "avatar_pose"))
      end)

    ThexrWeb.Endpoint.broadcast("space:#{state.space_id}", "movements", movements)
    ref = Process.send_after(self(), :broadcast_all_member_poses, @interval)
    {:noreply, %{state | ref: ref, should_sync: false}}
  end

  def handle_info(:broadcast_all_member_poses, %{should_sync: false} = state) do
    {:noreply, %{state | ref: nil}}
  end

  # clean up memory of members that have already left for a time of @kick_check_timeout
  def handle_info({:kick_check, member_id}, state) do
    new_members = Map.delete(state.members, member_id)

    state = %{
      state
      | disconnected: Map.delete(state.disconnected, member_id),
        members: new_members
    }

    {:noreply, state}
  end
end
