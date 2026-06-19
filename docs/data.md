# Data

Saved collections and requests live in a SQLite database at:

```
{userData}/harbor-client.db
```

On Linux this is typically `~/.config/harbor-client/`. Deleting a collection removes all requests in it (foreign key cascade).
