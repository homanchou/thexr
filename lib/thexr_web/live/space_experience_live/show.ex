defmodule ThexrWeb.SpaceExperienceLive.Show do
  use ThexrWeb, :live_view

  @impl true
  def mount(%{"id" => space_id}, %{"member_id" => member_id}, socket) do
    case Thexr.Worlds.get_space(space_id) do
      nil ->
        {:stop,
         socket
         |> put_flash(:error, "No such space \"#{space_id}\"")
         |> redirect(to: ~p"/spaces")}

      space ->
        ThexrWeb.Space.GrandSupervisor.start_space(space_id)

        {:ok,
         assign(socket,
           page_title: space.name,
           mic: nil,
           menu_state: :closed,
           entered: false,
           member_id: member_id,
           space: space
         ), layout: false}
    end
  end

  embed_templates "components/*.html"

  @impl true
  def handle_event("toggle_menu", _, socket) do
    new_menu_state =
      case socket.assigns.menu_state do
        :closed -> %{submenu: "about"}
        _ -> :closed
      end

    {:noreply, assign(socket, menu_state: new_menu_state)}
  end

  def handle_event("select_submenu", %{"submenu" => submenu}, socket) do
    {:noreply, assign(socket, menu_state: %{submenu: submenu})}
  end

  def handle_event("inspect_entity", %{"entity" => entity_name}, socket) do
    new_menu_state =
      socket.assigns.menu_state
      |> Map.put(:submenu, "inspector")
      |> Map.put(:subject, entity_name)

    {:noreply,
     assign(socket,
       menu_state: new_menu_state
     )}
  end

  def handle_event("toggle_mic", _, socket) do
    mic =
      case socket.assigns.mic do
        nil -> "unmuted"
        "muted" -> "unmuted"
        "unmuted" -> "muted"
      end

    {:noreply, assign(socket, mic: mic)}
  end

  def handle_event("request_vars", _payload, socket) do
    space_id = socket.assigns.space.id

    payload = %{
      space_id: space_id,
      member_id: socket.assigns.member_id,
      snapshot: ThexrWeb.Space.Manager.get_snapshot(space_id)
    }

    {:reply, payload, socket}
  end

  def handle_event("enter_space", _, socket) do
    socket = assign(socket, entered: true)
    {:noreply, socket}
  end
end
