defmodule ThexrWeb.SpaceController do
  use ThexrWeb, :controller

  def show(conn, %{"id" => space_id}) do
    IO.inspect(conn.assigns, label: "conn assigns")

    case Thexr.Worlds.get_space(space_id) do
      nil ->
        conn
        |> put_flash(:error, "No such space \"#{space_id}\"")
        |> redirect(to: ~p"/spaces")

      space ->
        member_id = conn.assigns[:member_id]
        ThexrWeb.Space.GrandSupervisor.start_space(space_id)

        vars =
          Jason.encode!(%{
            space_id: space_id,
            member_id: member_id,
            snapshot: ThexrWeb.Space.Manager.get_snapshot(space_id)
          })

        render(conn, :show,
          vars: vars,
          page_title: space.name,
          space_id: space_id,
          layout: false
        )
    end
  end
end
