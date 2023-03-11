defmodule ThexrWeb.SpaceChannel do
  use ThexrWeb, :channel
  alias ThexrWeb.Presence

  @impl true
  def join("space:" <> space_id, _payload, socket) do
    send(self(), :after_join)
    {:ok, assign(socket, space_id: space_id)}
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true

  def handle_in("imoved", payload, socket) do
    # TODO, cache this in ETS, and then broadcast at some desired interval
    broadcast_from(socket, "member_moved", Map.put(payload, "eid", socket.assigns.member_id))
    add_location_to_ets(socket, payload)
    {:noreply, socket}
  end

  def handle_in("ctos", payload, socket) do
    broadcast_from(socket, "stoc", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.member_id, %{
        online_at: inspect(System.system_time(:second))
      })

    push(socket, "presence_state", Presence.list(socket))

    space_state = ThexrWeb.SpaceServer.state(socket.assigns.space_id)
    socket = assign(socket, :ets_ref, space_state.ets_ref)
    push(socket, "member_locations", lookup_member_locations(socket))
    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    # tell the server the channel is disconnected
    push(socket, "server_lost", %{})
    {:noreply, socket}
  end

  def add_location_to_ets(socket, payload) do
    :ets.insert(socket.assigns.ets_ref, {socket.assigns.member_id, payload})
  end

  def lookup_member_locations(socket) do
    :ets.tab2list(socket.assigns.ets_ref)
    |> Enum.reduce(%{}, fn {member_id, payload}, acc ->
      Map.put(acc, member_id, payload)
    end)
  end
end
