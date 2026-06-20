# Settings

HarborClient application settings control appearance and where collections, requests, and environments are stored. Open settings from **File → Settings** or **Cmd/Ctrl+,**.

The settings panel has a sidebar with five sections: **General**, **SQLite**, **Firestore**, **MySQL**, and **PostgreSQL**. Backend-specific sections configure connection details for each provider; **General → Database provider** selects which backend is active.

Connection and provider settings are stored in electron-store on your machine. Collections, requests, and environments live in the active database backend.

## General

### Appearance

Choose how HarborClient looks:

| Option | Description |
| --- | --- |
| **Light** | Always use the light theme |
| **Dark** | Always use the dark theme |
| **System** | Match your operating system preference |

Theme changes apply immediately and do not require a restart.

### Database provider

Select where HarborClient stores collections, requests, and environments:

| Provider | Description |
| --- | --- |
| **SQLite** | Local database file in app user data (default) |
| **Firestore** | Remote cloud storage via Firebase |
| **MySQL** | Remote storage on a MySQL server |
| **PostgreSQL** | Remote storage on a PostgreSQL server |

Changing the provider requires restarting HarborClient. Configure the connection details for your chosen provider in the matching settings section (**SQLite**, **Firestore**, **MySQL**, or **PostgreSQL**) before restarting.

When you use a remote backend such as Firestore, MySQL, or PostgreSQL, multiple HarborClient instances can point at the same database to share collections, environments, and saved requests across your team. Changes from other users appear when you reload data (for example, after restarting the app or refreshing collections); HarborClient does not live-sync in the background.

## SQLite

SQLite is the default local backend. The database file lives in HarborClient app user data at `{userData}/{dbFilename}` (default filename: `harborclient.db`).

| Field | Description |
| --- | --- |
| **Database filename** | Filename of the primary database file within user data |
| **Legacy database filename** | Filename of an older database file used for one-time migration (default: `harbor-client.db`) |
| **Legacy data directory** | Legacy application data directory name under app data (default: `harbor-client`) |

Click **Save**, then restart HarborClient for changes to take effect.

On first launch, HarborClient may copy an existing database from the legacy path if the primary file does not exist yet.

## Firestore

Firestore stores collections, requests, and environments in a shared Firebase project. Use this backend when you want cloud-backed storage or team access to the same data.

| Field | Description |
| --- | --- |
| **API key** | Firebase Web API key |
| **Auth domain** | Firebase Auth domain |
| **Project ID** | Firebase project ID |
| **App ID** | Firebase app ID |
| **Email** | Email for Firebase Auth sign-in |
| **Password** | Password for Firebase Auth sign-in |

Click **Save**, then restart HarborClient. Select **Firestore** as the database provider in **General** before restarting.

If Firestore initialization fails at startup (for example, incomplete settings or a connection error), HarborClient falls back to SQLite and logs the error to the console.

## MySQL

MySQL stores collections, requests, and environments on a remote MySQL server. Use this backend for self-hosted or team-shared storage.

| Field | Description | Default |
| --- | --- | --- |
| **Host** | MySQL server hostname | `127.0.0.1` |
| **Port** | MySQL server port | `3306` |
| **User** | MySQL username | (empty) |
| **Password** | MySQL password | (empty) |
| **Database** | MySQL database name | (empty) |

Click **Save**, then restart HarborClient. Select **MySQL** as the database provider in **General** before restarting.

If MySQL initialization fails at startup, HarborClient falls back to SQLite and logs the error to the console.

## PostgreSQL

PostgreSQL stores collections, requests, and environments on a remote PostgreSQL server. Use this backend for self-hosted or team-shared storage.

| Field | Description | Default |
| --- | --- | --- |
| **Host** | PostgreSQL server hostname | `127.0.0.1` |
| **Port** | PostgreSQL server port | `5432` |
| **User** | PostgreSQL username | (empty) |
| **Password** | PostgreSQL password | (empty) |
| **Database** | PostgreSQL database name | (empty) |

Click **Save**, then restart HarborClient. Select **PostgreSQL** as the database provider in **General** before restarting.

If PostgreSQL initialization fails at startup, HarborClient falls back to SQLite and logs the error to the console.

## What's next

- [Collections](/collections) — organize saved requests and manage storage and backup
- [Environments](/environments) — define global variable groups stored in your chosen backend
- [Features](/features) — overview of database backends and team collaboration
