defmodule ThexrWeb.SpaceMenu.Index do
  use ThexrWeb, :live_view

  @impl true
  def mount(_params, %{"member_id" => member_id, "space_id" => space_id}, socket) do
    ThexrWeb.Endpoint.subscribe("menuin:#{member_id}")

    {:ok,
     assign(socket,
       mic: nil,
       menu_opened: false,
       entered: false,
       member_id: member_id,
       space_id: space_id
     ), layout: false}
  end

  @impl true
  def handle_event("enter_space", _, socket) do
    {:noreply, assign(socket, entered: true)}
  end

  def handle_event("toggle_menu", _, socket) do
    mic =
      ThexrWeb.Space.Manager.get_members(socket.assigns.space_id)
      |> get_in([socket.assigns.member_id, "mic"])

    IO.inspect(mic, label: "mic")

    {:noreply, assign(socket, mic: mic, menu_opened: !socket.assigns.menu_opened)}
  end

  @impl true
  def handle_info(%{event: "mic_toggled", payload: payload}, socket) do
    socket = assign(socket, mic: payload["mic"])
    {:noreply, socket}
  end
end
