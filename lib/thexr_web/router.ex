defmodule ThexrWeb.Router do
  use ThexrWeb, :router

  import ThexrWeb.UserAuth

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, {ThexrWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :fetch_current_user
    plug :maybe_assign_member_id
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", ThexrWeb do
    pipe_through :browser

    get "/", PageController, :home
    live "/spaces", SpaceLive.Index, :index
    live "/spaces/new", SpaceLive.Index, :new
    live "/spaces/:id/edit", SpaceLive.Index, :edit

    # live "/spaces/:id", SpaceLive.Show, :show
    # live "/spaces/:id", SpaceExperienceLive.Show
    get "/spaces/:id", SpaceController, :show

    live "/spaces/:id/show/edit", SpaceLive.Show, :edit

    get "/test", TestController, :index
  end

  def maybe_assign_member_id(conn, _) do
    case get_session(conn, :member_id) do
      nil ->
        case conn.assigns.current_user do
          %Thexr.Accounts.User{id: member_id} ->
            conn |> put_session(:member_id, member_id) |> assign(:member_id, member_id)

          nil ->
            member_id = Thexr.Utils.random_string(5)
            conn |> put_session(:member_id, member_id) |> assign(:member_id, member_id)
        end

      existing_id ->
        conn |> assign(:member_id, existing_id)
    end
  end

  # Other scopes may use custom stacks.
  # scope "/api", ThexrWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:thexr, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: ThexrWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end

  ## Authentication routes

  scope "/", ThexrWeb do
    pipe_through [:browser, :redirect_if_user_is_authenticated]

    live_session :redirect_if_user_is_authenticated,
      on_mount: [{ThexrWeb.UserAuth, :redirect_if_user_is_authenticated}] do
      live "/users/register", UserRegistrationLive, :new
      live "/users/log_in", UserLoginLive, :new
      live "/users/reset_password", UserForgotPasswordLive, :new
      live "/users/reset_password/:token", UserResetPasswordLive, :edit
    end

    post "/users/log_in", UserSessionController, :create
  end

  scope "/", ThexrWeb do
    pipe_through [:browser, :require_authenticated_user]

    live_session :require_authenticated_user,
      on_mount: [{ThexrWeb.UserAuth, :ensure_authenticated}] do
      live "/users/settings", UserSettingsLive, :edit
      live "/users/settings/confirm_email/:token", UserSettingsLive, :confirm_email
    end
  end

  scope "/", ThexrWeb do
    pipe_through [:browser]

    delete "/users/log_out", UserSessionController, :delete

    live_session :current_user,
      on_mount: [{ThexrWeb.UserAuth, :mount_current_user}] do
      live "/users/confirm/:token", UserConfirmationLive, :edit
      live "/users/confirm", UserConfirmationInstructionsLive, :new
    end
  end
end
