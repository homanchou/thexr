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
       aggregate: %{},
       entities_to_delete: [],
       components_to_delete: [],
       flush_ref: nil
     }}
  end

  def get_aggregate(pid) do
    GenServer.call(pid, :get_aggregate)
  end

  def handle_call(:get_aggregate, _from, state) do
    {:noreply, state.aggregate, state}
  end

  def handle_cast({:process_event, %{"set" => %{"avatar_pose" => _}}, _}, state) do
    {:noreply, state}
  end

  def handle_cast({:process_event, %{"set" => %{"avatar" => _}}, _}, state) do
    {:noreply, state}
  end

  def handle_cast({:process_event, %{"eid" => _, "del" => ["avatar"]}, _}, state) do
    {:noreply, state}
  end

  def handle_cast({:process_event, %{"eid" => eid, "set" => components}, _}, state) do
    entity_value = Map.get(state.aggregate, eid, %{})
    entity_value = Enum.into(components, entity_value)
    state = %{state | aggregate: Map.put(state.aggregate, eid, entity_value)}
    IO.inspect(state.aggregate, label: "aggregate")

    state =
      case Map.get(state, :flush_ref) do
        nil ->
          Map.put(state, :flush_ref, Process.send_after(self(), :flush_snapshot, @flush_after))

        _ ->
          state
      end

    {:noreply, state}
  end

  def handle_cast({:process_event, %{"eid" => eid, "del" => component_names}, _}, state) do
    entity_value = Map.get(state.aggregate, eid, %{})

    entity_value =
      Map.reject(entity_value, fn {k, _v} ->
        Enum.member?(component_names, k)
      end)

    aggregate = Map.put(state.aggregate, eid, entity_value)
    components_to_delete = [{eid, component_names} | state.components_to_delete]

    state =
      case Map.get(state, :flush_ref) do
        nil ->
          Map.put(state, :flush_ref, Process.send_after(self(), :flush_snapshot, @flush_after))

        _ ->
          state
      end

    {:noreply, %{state | aggregate: aggregate, components_to_delete: components_to_delete}}
  end

  def handle_cast({:process_event, %{"eid" => entity_to_delete, "ttl" => _}, _}, state) do
    aggregate = Map.delete(state.aggregate, entity_to_delete)
    entities_to_delete = [entity_to_delete | state.entities_to_delete]

    state =
      case Map.get(state, :flush_ref) do
        nil ->
          Map.put(state, :flush_ref, Process.send_after(self(), :flush_snapshot, @flush_after))

        _ ->
          state
      end

    {:noreply, %{state | aggregate: aggregate, entities_to_delete: entities_to_delete}}
  end

  def handle_info(:flush_snapshot, state) do
    Thexr.Worlds.update_snapshot(
      state.space_id,
      state.aggregate,
      state.components_to_delete,
      state.entities_to_delete
    )

    state = Map.put(state, :aggregate, %{})
    state = Map.put(state, :components_to_delete, [])
    state = Map.put(state, :entities_to_delete, [])
    state = Map.put(state, :flush_ref, nil)
    {:noreply, state}
  end

  def handle_info(:after_init, state) do
    ThexrWeb.Space.Manager.save_pid(state.space_id, :snapshotter, self())
    {:noreply, state}
  end
end
