defmodule ThexrWeb.Space.Membership do
  use GenServer, restart: :transient

  import Thexr.Registry, only: [via_tuple: 2]

  @kick_check_timeout :timer.seconds(5)

  def start_link(space_id) do
    IO.inspect("member ship start link called")
    GenServer.start_link(__MODULE__, space_id, name: via_tuple(:membership, space_id))
  end

  def state(space_id) do
    GenServer.call(via_tuple(:membership, space_id), :get_state)
  end

  def member_joined(space_id, member_id) do
    GenServer.cast(via_tuple(:membership, space_id), {:member_joined, member_id})
  end

  def member_left(space_id, member_id) do
    GenServer.cast(via_tuple(:membership, space_id), {:member_left, member_id})
  end

  #################################################################
  # Server Callbacks
  #################################################################

  def init(space_id) do
    send(self(), :after_init)
    IO.inspect("membershpi started")
    {:ok, %{space_id: space_id, disconnected: Map.new()}}
  end

  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  def handle_cast({:member_joined, member_id}, state) do
    case Map.pop(state.disconnected, member_id) do
      {nil, _prev_disconnected} ->
        {:noreply, state}

      {ref, new_disconnected} ->
        Process.cancel_timer(ref)
        {:noreply, %{state | disconnected: new_disconnected}}
    end
  end

  def handle_cast({:member_left, member_id}, state) do
    ref = Process.send_after(self(), {:kick_check, member_id}, @kick_check_timeout)
    new_disconnected = Map.put(state.disconnected, member_id, ref)
    {:noreply, %{state | disconnected: new_disconnected}}
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

    {:noreply, state}
  end

  def handle_info({:kick_check, member_id}, state) do
    :ets.delete(state.ets_ref, member_id)

    state = %{state | disconnected: Map.delete(state.disconnected, member_id)}
    {:noreply, state}
  end
end
