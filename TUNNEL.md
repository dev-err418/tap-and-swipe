# Local Database Tunnel

The production database runs inside a Docker container on the Oracle VPS. It's not accessible from your local machine without an SSH tunnel.

## Setup

**1. Start the tunnel**

```bash
ssh -f -N -L 15432:10.0.2.10:5432 oracle-web
```

This maps `localhost:15432` to the Postgres container on the VPS.

**2. Create `.env.local`** (if not already done)

```
DATABASE_URL="postgresql://postgres:fetpF6Qedm1wI4BWhw3K8o72gppUGARIY6c4s3C41bKMLqrUhBNMsWrWKzuY2dht@localhost:15432/tap_and_swipe"
```

`.env.local` overrides `.env`, so the app connects through the tunnel instead of the Docker-internal hostname.

**3. Run the dev server**

```bash
npm run dev
```

## Stopping the tunnel

```bash
kill $(lsof -t -i :15432)
```

## TablePlus connection

| Field | Value |
|-------|-------|
| Host | `10.0.2.10` |
| Port | `5432` |
| User | `postgres` |
| Password | `fetpF6Qedm1wI4BWhw3K8o72gppUGARIY6c4s3C41bKMLqrUhBNMsWrWKzuY2dht` |
| Database | `tap_and_swipe` |
| SSH Host | `141.145.218.149` |
| SSH User | `ubuntu` |
| SSH Key | `~/.ssh/oracle-web.key` |

## Notes

- The tunnel must be running for any local Prisma command (seed, migrate, generate with introspection, etc.)
- The old database (`web`) is on a different container at `10.0.2.8`. Don't use it for new development.
- If the tunnel dies, just re-run the ssh command above.
