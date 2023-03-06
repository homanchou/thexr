defmodule ThexrWeb.SpaceMenu.Index do
  use ThexrWeb, :live_view

  @impl true
  def mount(_params, %{"member_id" => member_id, "space_id" => space_id}, socket) do
    {:ok, assign(socket, entered: false, member_id: member_id, space_id: space_id), layout: false}
  end

  @impl true
  def handle_event("enter_space", _, socket) do
    {:noreply, assign(socket, entered: true)}
  end
end
