defmodule ThexrWeb.MenuComponentLive do
  use ThexrWeb, :live_component

  embed_templates "components/*"

  def mount(socket) do
    socket = assign(socket, submenu: nil, subject: nil)
    {:ok, socket}
  end

  def handle_event("inspect_subject", %{"subject" => subject}, socket) do
    socket = assign(socket, submenu: "inspector", subject: subject)
    {:noreply, socket}
  end

  def handle_event("select_submenu", %{"submenu" => submenu}, socket) do
    socket = assign(socket, submenu: submenu)
    {:noreply, socket}
  end

  def render(assigns) do
    ~H"""
    <div id="menu_base" phx-hook="menu_hook">
      <!-- bars -->
      <div :if={!@menu_opened} class="absolute z-50  top-0 left-0 w-4 h-4 bg-red-400">
        <button id="toggle_menu" class="block bg-red-500" phx-click="toggle_menu">
          <Heroicons.bars_3 class="h-10 w-10" />
        </button>
      </div>

      <div
        :if={@menu_opened}
        class="w-6/12 h-full bg-red-300 absolute z-50 bg-opacity-50 border-2 border-red-950"
      >
        <.button id="toggle_menu" class="absolute right-0 top-0" phx-click="toggle_menu">
          <Heroicons.x_mark class="h-6 w-6" />
        </.button>

        <div class="flex w-full h-full">
          <.sidebar myself={@myself} />
          <.rightpanel
            submenu={@submenu}
            space={@space}
            member_id={@member_id}
            menu_component_live={@myself}
          />
        </div>
      </div>
    </div>
    """
  end
end
