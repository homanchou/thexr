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

  def active_poses(pid) do
    GenServer.call(pid, :get_active_poses)
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
    {:ok, %{space_id: space_id, disconnected: %{}, poses: %{}, ref: nil, should_sync: false}}
  end

  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  def handle_call(:get_active_poses, _from, state) do
    active_poses =
      Map.reject(state.poses, fn {k, _v} ->
        Map.has_key?(state.disconnected, k)
      end)

    {:reply, active_poses, state}
  end

  def handle_cast(
        {:process_event, %{"eid" => member_id, "set" => %{"avatar_pose" => avatar_pose}}, _from},
        state
      ) do
    new_poses = Map.put(state.poses, member_id, avatar_pose)

    state =
      case state.ref do
        nil ->
          ref = Process.send_after(self(), :broadcast_all_member_poses, @interval)
          %{state | ref: ref}

        _ ->
          state
      end

    {:noreply, %{state | poses: new_poses, should_sync: true}}
  end

  def handle_cast(
        {:process_event, %{"eid" => member_id, "set" => %{"avatar" => _}}, _from},
        state
      ) do
    case Map.pop(state.disconnected, member_id) do
      {nil, _prev_disconnected} ->
        {:noreply, state}

      {ref, new_disconnected} ->
        Process.cancel_timer(ref)
        {:noreply, %{state | disconnected: new_disconnected}}
    end
  end

  def handle_cast({:process_event, %{"eid" => member_id, "del" => ["avatar"]}, _}, state) do
    ref = Process.send_after(self(), {:kick_check, member_id}, @kick_check_timeout)
    new_disconnected = Map.put(state.disconnected, member_id, ref)
    {:noreply, %{state | disconnected: new_disconnected}}
  end

  def handle_cast({:process_event, _, _}, state) do
    {:noreply, state}
  end

  # def handle_cast({:member_joined, member_id}, state) do
  #   case Map.pop(state.disconnected, member_id) do
  #     {nil, _prev_disconnected} ->
  #       {:noreply, state}

  #     {ref, new_disconnected} ->
  #       Process.cancel_timer(ref)
  #       {:noreply, %{state | disconnected: new_disconnected}}
  #   end
  # end

  # def handle_cast({:member_left, member_id}, state) do
  #   ref = Process.send_after(self(), {:kick_check, member_id}, @kick_check_timeout)
  #   new_disconnected = Map.put(state.disconnected, member_id, ref)
  #   {:noreply, %{state | disconnected: new_disconnected}}
  # end

  def handle_info(:after_init, state) do
    ThexrWeb.Space.Manager.save_pid(state.space_id, :membership, self())
    {:noreply, state}
  end

  def handle_info(:broadcast_all_member_poses, %{should_sync: true} = state) do
    ThexrWeb.Endpoint.broadcast("space:#{state.space_id}", "poses", state.poses)
    ref = Process.send_after(self(), :broadcast_all_member_poses, @interval)
    {:noreply, %{state | ref: ref, should_sync: false}}
  end

  def handle_info(:broadcast_all_member_poses, %{should_sync: false} = state) do
    {:noreply, %{state | ref: nil}}
  end

  def handle_info({:kick_check, member_id}, state) do
    new_poses = Map.delete(state.poses, member_id)

    state = %{state | disconnected: Map.delete(state.disconnected, member_id), poses: new_poses}
    {:noreply, state}
  end
end
