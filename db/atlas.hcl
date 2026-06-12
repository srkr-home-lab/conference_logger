env "local" {
  src = "file://schema.hcl"
  dev = "docker://mysql/8/dev"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://migrations"
  }
}
