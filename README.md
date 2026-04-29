# Yeladim API

Standalone backend API for the Yeladim mobile app, owner admin, and public website.

This first version is dependency-free so it can run immediately while the production stack is finalized. It persists local development data to `data/dev-db.json`. The included Prisma schema describes the intended PostgreSQL production model.

## Run

```bash
cd yeladim-api
npm run dev
```

Default URL:

```text
http://localhost:4100
```

## Important Endpoints

- `GET /health`
- `POST /v1/owner/centers`
- `GET /v1/owner/centers`
- `POST /v1/owner/invite-codes`
- `GET /v1/owner/invite-codes`
- `POST /v1/public/leads`
- `GET /v1/owner/leads`
- `POST /v1/auth/validate-invite-code`
- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `POST /v1/messages`
- `GET /v1/messages?center_id=...`
- `POST /v1/uploads/presign`
- `POST /v1/push/register`

## Storage Provider

The API supports either DigitalOcean Spaces or AWS S3 through S3-compatible settings.

DigitalOcean Spaces staging example:

```text
STORAGE_PROVIDER=spaces
STORAGE_BUCKET=yeladim-centers-staging
STORAGE_REGION=nyc3
STORAGE_ENDPOINT=https://nyc3.digitaloceanspaces.com
```

AWS S3 production example:

```text
STORAGE_PROVIDER=s3
STORAGE_BUCKET=yeladim-centers-prod
STORAGE_REGION=us-east-1
STORAGE_ENDPOINT=https://s3.amazonaws.com
S3_KMS_KEY_ALIAS=alias/yeladim-media
```

## Production TODO

1. Replace the transitional JSONB app-state table with fully normalized Prisma tables.
2. Put API behind HTTPS only.
3. Move secrets to AWS Secrets Manager or equivalent.
4. Use AWS KMS for message encryption keys.
5. Use S3 signed URLs for uploads.
6. Add Redis-backed rate limiting and WebSocket presence.
7. Add Postmark/SES email delivery for demo requests and invites.

## DigitalOcean PostgreSQL

Set this environment variable in the API service. Do not commit the real password.

```text
DATABASE_URL=postgresql://doadmin:YOUR_PASSWORD@private-yeladim-prod-db-do-user-16793964-0.j.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

The API uses PostgreSQL when `DATABASE_URL` is present. If it is missing, it falls back to `data/dev-db.json` for local development.
