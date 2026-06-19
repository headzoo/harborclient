# Data

Saved collections and requests live in a SQLite database at:

```
{userData}/harborclient.db
```

On Linux this is typically `~/.config/harborclient/`. Deleting a collection removes all requests in it (foreign key cascade).
