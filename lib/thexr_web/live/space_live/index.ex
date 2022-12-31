defmodule ThexrWeb.SpaceLive.Index do
  use ThexrWeb, :live_view

  alias Thexr.Worlds
  alias Thexr.Worlds.Space

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :spaces, list_spaces())}
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  defp apply_action(socket, :edit, %{"id" => id}) do
    socket
    |> assign(:page_title, "Edit Space")
    |> assign(:space, Worlds.get_space!(id))
  end

  defp apply_action(socket, :new, _params) do
    socket
    |> assign(:page_title, "New Space")
    |> assign(:space, %Space{})
  end

  defp apply_action(socket, :index, _params) do
    socket
    |> assign(:page_title, "Listing Spaces")
    |> assign(:space, nil)
  end

  @impl true
  def handle_event("delete", %{"id" => id}, socket) do
    space = Worlds.get_space!(id)
    {:ok, _} = Worlds.delete_space(space)

    {:noreply, assign(socket, :spaces, list_spaces())}
  end

  defp list_spaces do
    Worlds.list_spaces()
  end
end
