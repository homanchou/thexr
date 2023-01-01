defmodule Thexr.Repo.Migrations.CreateSpaces do
  use Ecto.Migration

  def change do
    create table(:spaces, primary_key: false) do
      add :id, :string, primary_key: true
      add :name, :string
      add :description, :text

      timestamps()
    end
  end
end
