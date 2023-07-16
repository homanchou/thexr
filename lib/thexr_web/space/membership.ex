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

  # members is components about all the members currently in the space
  # should_sync is a set of members that have moved sync the last sync
  # disconnected is a set of members that have disconnected and is used to determine
  # if a member needs to be kicked out of the space
  # ref: is used to store a timer for syncing out all unsynced members
  def init(space_id) do
    send(self(), :after_init)

    {:ok,
     %{space_id: space_id, disconnected: %{}, members: %{}, ref: nil, should_sync: MapSet.new()}}
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
    state = %{
      state
      | members: Thexr.Worlds.update_snapshot(state.members, [cmd]),
        should_sync: MapSet.put(state.should_sync, cmd["eid"])
    }

    state =
      case state.ref do
        nil ->
          ref = Process.send_after(self(), :broadcast_active_member_poses, @interval)
          %{state | ref: ref}

        _ ->
          state
      end

    {:noreply, state}
  end

  # someone came back (or joined), so remove the disconnection timer if there was one
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

  # handle someone leaving
  # we don't want to delete them just yet because they might just be refreshing their tab
  # we'll create a timer to check back and for now add them in a disconnected list
  def handle_cast(
        {:process_event, %{"eid" => member_id, "ttl" => _, "tag" => "m"}, _},
        state
      ) do
    ref = Process.send_after(self(), {:kick_check, member_id}, @kick_check_timeout)
    new_disconnected = Map.put(state.disconnected, member_id, ref)
    {:noreply, %{state | disconnected: new_disconnected}}
  end

  # mic or any other components changes on a member
  def handle_cast({:process_event, %{"tag" => "m"} = cmd, _}, state) do
    state = %{state | members: Thexr.Worlds.update_snapshot(state.members, [cmd])}
    {:noreply, state}
  end

  # any non-member related events are ignored
  def handle_cast({:process_event, _, _}, state) do
    {:noreply, state}
  end

  # tell manager to save our pid so we can receive all events that are directed at them

  def handle_info(:after_init, state) do
    ThexrWeb.Space.Manager.save_pid(state.space_id, :membership, self())
    {:noreply, state}
  end

  def handle_info(:broadcast_active_member_poses, state) do
    # movements =
    #   Enum.reduce(state.members, %{}, fn {member_id, components}, acc ->
    #     case Map.get(components, "avatar_pose") do
    #       nil -> acc
    #       pose -> Map.put(acc, member_id, pose)
    #     end
    #   end)
    movements =
      Enum.reduce(state.should_sync, %{}, fn member_id, acc ->
        case Map.get(state.members[member_id], "avatar_pose") do
          nil -> acc
          pose -> Map.put(acc, member_id, pose)
        end
      end)

    ThexrWeb.Endpoint.broadcast("space:#{state.space_id}", "movements", movements)
    # ref = Process.send_after(self(), :broadcast_active_member_poses, @interval)
    {:noreply, %{state | ref: nil, should_sync: MapSet.new()}}
  end

  # def handle_info(:broadcast_active_member_poses, %{should_sync: false} = state) do
  #   {:noreply, %{state | ref: nil}}
  # end

  # handle a timer event created when a member left to see if they "really left"
  # if the timer wasn't canceled, then remove them for real now
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
