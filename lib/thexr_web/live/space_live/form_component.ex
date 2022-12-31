defmodule ThexrWeb.SpaceLive.FormComponent do
  use ThexrWeb, :live_component

  alias Thexr.Worlds

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.header>
        <%= @title %>
        <:subtitle>Use this form to manage space records in your database.</:subtitle>
      </.header>

      <.simple_form
        :let={f}
        for={@changeset}
        id="space-form"
        phx-target={@myself}
        phx-change="validate"
        phx-submit="save"
      >
        <.input field={{f, :name}} type="text" label="name" />
        <.input field={{f, :description}} type="text" label="description" />
        <:actions>
          <.button phx-disable-with="Saving...">Save Space</.button>
        </:actions>
      </.simple_form>
    </div>
    """
  end

  @impl true
  def update(%{space: space} = assigns, socket) do
    changeset = Worlds.change_space(space)

    {:ok,
     socket
     |> assign(assigns)
     |> assign(:changeset, changeset)}
  end

  @impl true
  def handle_event("validate", %{"space" => space_params}, socket) do
    changeset =
      socket.assigns.space
      |> Worlds.change_space(space_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, :changeset, changeset)}
  end

  def handle_event("save", %{"space" => space_params}, socket) do
    save_space(socket, socket.assigns.action, space_params)
  end

  defp save_space(socket, :edit, space_params) do
    case Worlds.update_space(socket.assigns.space, space_params) do
      {:ok, _space} ->
        {:noreply,
         socket
         |> put_flash(:info, "Space updated successfully")
         |> push_navigate(to: socket.assigns.navigate)}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, :changeset, changeset)}
    end
  end

  defp save_space(socket, :new, space_params) do
    case Worlds.create_space(space_params) do
      {:ok, _space} ->
        {:noreply,
         socket
         |> put_flash(:info, "Space created successfully")
         |> push_navigate(to: socket.assigns.navigate)}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end
end
