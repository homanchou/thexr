defmodule ThexrWeb.SpaceChannel do
  use ThexrWeb, :channel
  alias ThexrWeb.Presence
  alias ThexrWeb.SpaceServer

  @impl true
  def join("space:" <> space_id, _payload, socket) do
    send(self(), :after_join)
    {:ok, assign(socket, space_id: space_id)}
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true

  def handle_in("imoved", payload, socket) do
    SpaceServer.process_event(
      socket.assigns.space_id,
      %{
        "eid" => socket.assigns.member_id,
        "set" => %{"avatar_pose" => payload}
      },
      self()
    )

    # TODO, cache this in ETS, and then broadcast at some desired interval

    # broadcast_from(socket, "stoc", %{eid: socket.assigns.member_id, set: %{avatar_pos: payload}})
    add_location_to_ets(socket, payload)
    {:noreply, socket}
  end

  def handle_in("ctos", payload, socket) do
    # broadcast_from(socket, "stoc", payload)
    SpaceServer.process_event(socket.assigns.space_id, payload, self())
    {:noreply, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.member_id, %{
        online_at: inspect(System.system_time(:second))
      })

    push(socket, "presence_state", Presence.list(socket))

    space_state = SpaceServer.state(socket.assigns.space_id)
    socket = assign(socket, :ets_ref, space_state.ets_ref)
    push(socket, "member_poses", lookup_member_poses(socket))

    # test to see if we receive some kind of message when the genserver timesout
    Process.monitor(Swarm.whereis_name(socket.assigns.space_id))

    # SpaceServer.process_event(
    #   socket.assigns.space_id,
    #   %{
    #     "eid" => socket.assigns.member_id,
    #     "set" => %{"avatar" => "box"}
    #   },
    #   self()
    # )

    {:noreply, socket}
  end

  # the moniter

  def handle_info(
        {:DOWN, _ref, :process, _pid,
         {:function_clause,
          [
            {ThexrWeb.SpaceServer, :handle_info, [:timeout | _], _}
            | _
          ]}},
        _socket
      ) do
    IO.inspect("a timeout happened")
  end

  @impl true
  def terminate(_reason, socket) do
    # tell the server the channel is disconnected
    # SpaceServer.process_event(
    #   socket.assigns.space_id,
    #   %{
    #     "eid" => socket.assigns.member_id,
    #     "ttl" => 0
    #   },
    #   self()
    # )

    push(socket, "server_lost", %{})
    {:noreply, socket}
  end

  def add_location_to_ets(socket, payload) do
    :ets.insert(socket.assigns.ets_ref, {socket.assigns.member_id, payload})
  end

  def lookup_member_poses(socket) do
    :ets.tab2list(socket.assigns.ets_ref)
    |> Enum.reduce(%{}, fn {member_id, payload}, acc ->
      Map.put(acc, member_id, payload)
    end)
  end
end
