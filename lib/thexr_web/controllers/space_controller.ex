defmodule ThexrWeb.SpaceController do
  use ThexrWeb, :controller

  def show(conn, %{"space_id" => space_id}) do
    # The home page is often custom made,
    # so skip the default app layout.
    render(conn, :show, space_id: space_id, layout: false)
  end
end
