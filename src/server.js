import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
const dbPath = path.join(dataDir, 'dev-db.json');

const host = process.env.API_BIND_HOST || '0.0.0.0';
const port = Number(process.env.PORT || 4100);
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-before-production';
const salesEmail = process.env.SALES_EMAIL || 'sales@yeladim.app';
const salesFromEmail = process.env.SALES_FROM_EMAIL || 'Yeladim <sales@yeladim.app>';
const resendApiKey = process.env.RESEND_API_KEY;
const databaseUrl = process.env.DATABASE_URL;
const bootstrapOwnerEmail = process.env.OWNER_EMAIL;
const bootstrapOwnerPassword = process.env.OWNER_PASSWORD;
const bootstrapOwnerName = process.env.OWNER_NAME || 'Platform Owner';
const storageProvider = process.env.STORAGE_PROVIDER || 'spaces';
const storageBucket = process.env.STORAGE_BUCKET || process.env.S3_BUCKET || 'yeladim-dev';
const storageRegion = process.env.STORAGE_REGION || process.env.AWS_REGION || 'nyc3';
const storageEndpoint = process.env.STORAGE_ENDPOINT || (
  storageProvider === 'spaces'
    ? `https://${storageRegion}.digitaloceanspaces.com`
    : 'https://s3.amazonaws.com'
);
const storageAccessKeyId = process.env.STORAGE_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const storageSecretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const storageCdnUrl = process.env.STORAGE_CDN_URL || '';
const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:8081',
  'http://localhost:19006',
  'https://eynomer.com',
  'https://www.eynomer.com',
  'https://controladm.eynomer.com',
  'https://owner.eynomer.com',
  'https://yeladim-owner-admin-vi4mq.ondigitalocean.app',
  ...configuredOrigins,
]);

const demoActivities = [
  {
    id: 1000,
    center_id: 'center_demo',
    kid_id: 101,
    type: 'check_in',
    title: 'Check-In',
    description: 'Ryan arrived at 8:45 AM with a big smile and was so excited to see his friends!',
    timestamp: '2024-05-14T08:45:00.000Z',
    file_url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=900&q=80',
    file_urls: [
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80',
    ],
    created_at: '2024-05-14T08:45:00.000Z',
  },
  {
    id: 1001,
    center_id: 'center_demo',
    kid_id: 101,
    type: 'art',
    title: 'Art & Creativity',
    description: 'Ryan enjoyed painting and made a beautiful rainbow! He was very creative today.',
    timestamp: '2024-05-14T10:15:00.000Z',
    created_at: '2024-05-14T10:15:00.000Z',
  },
  {
    id: 1002,
    center_id: 'center_demo',
    kid_id: 101,
    type: 'lunch',
    title: 'Lunch Time',
    description: 'Ryan had a healthy lunch and ate everything! He tried broccoli and liked it too.',
    timestamp: '2024-05-14T12:30:00.000Z',
    file_url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80',
    created_at: '2024-05-14T12:30:00.000Z',
  },
  {
    id: 1006,
    center_id: 'center_demo',
    kid_id: 101,
    type: 'nap',
    title: 'Nap Time',
    description: 'Ryan had a good nap and is all rested up for more fun!',
    timestamp: '2024-05-14T14:00:00.000Z',
    created_at: '2024-05-14T14:00:00.000Z',
  },
  {
    id: 1007,
    center_id: 'center_demo',
    kid_id: 101,
    type: 'play',
    title: 'Play Time',
    description: 'Ryan loved building tall towers with blocks and playing with his friends in the play area.',
    timestamp: '2024-05-14T15:30:00.000Z',
    file_url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80',
    created_at: '2024-05-14T15:30:00.000Z',
  },
  {
    id: 1003,
    center_id: 'center_demo',
    kid_id: 102,
    type: 'check_in',
    title: 'Check-In',
    description: 'Mia came in smiling and waved to everyone in the Sun Room.',
    timestamp: '2024-05-14T08:55:00.000Z',
    created_at: '2024-05-14T08:55:00.000Z',
  },
  {
    id: 1004,
    center_id: 'center_demo',
    kid_id: 103,
    type: 'potty',
    title: 'Potty success',
    description: 'Asked independently and was very proud.',
    timestamp: '2026-02-04T15:05:00.000Z',
    created_at: '2026-02-04T15:05:00.000Z',
  },
  {
    id: 1005,
    center_id: 'center_demo',
    kid_id: 104,
    type: 'diaper',
    title: 'Diaper change',
    description: 'Fresh change and ready to play.',
    timestamp: '2026-02-06T13:10:00.000Z',
    created_at: '2026-02-06T13:10:00.000Z',
  },
];

const defaultDb = {
  centers: [
    {
      id: 'center_demo',
      public_id: 'CTR-YELADIM',
      name: 'Yeladim Learning Center',
      billing_email: 'billing@yeladim.test',
      status: 'active',
      created_at: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: 'owner_demo',
      center_id: null,
      email: 'owner@yeladim.app',
      full_name: 'Yeladim Owner',
      password_hash: hashPassword('demo'),
      roles: ['owner'],
      created_at: new Date().toISOString(),
    },
  ],
  invite_codes: [],
  leads: [],
  activities: demoActivities,
  messages: [],
  push_tokens: [],
  media_objects: [],
  audit_events: [],
  owner_settings: {
    storage_settings: {
      provider: 'spaces',
      bucket: 'yeladim-centers-staging',
      region: 'nyc3',
      endpoint: 'https://nyc3.digitaloceanspaces.com',
      cdnUrl: '',
    },
  },
};

let pgPoolPromise;

function getSanitizedDatabaseUrl() {
  const url = new URL(databaseUrl);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslrootcert');
  url.searchParams.delete('sslcert');
  url.searchParams.delete('sslkey');
  return url.toString();
}

async function getPgPool() {
  if (!databaseUrl) {
    return null;
  }
  if (!pgPoolPromise) {
    pgPoolPromise = import('pg').then(({Pool}) => new Pool({
      connectionString: getSanitizedDatabaseUrl(),
      ssl: {rejectUnauthorized: false},
    }));
  }
  return pgPoolPromise;
}

async function ensurePostgresStore(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS yeladim_app_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `
      INSERT INTO yeladim_app_state (key, value)
      VALUES ('main', $1::jsonb)
      ON CONFLICT (key) DO NOTHING
    `,
    [JSON.stringify(defaultDb)],
  );
}

function hashPassword(password) {
  const salt = 'dev-salt';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, hash) {
  return crypto.timingSafeEqual(Buffer.from(hashPassword(password)), Buffer.from(hash));
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, character =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeS3Path(value) {
  return String(value)
    .split('/')
    .map(segment => encodeRfc3986(segment))
    .join('/');
}

function sanitizeFilename(filename = 'upload') {
  const clean = String(filename)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || 'upload';
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function getAwsSigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function getRuntimeStorageSettings(db) {
  const saved = db?.owner_settings?.storage_settings || {};
  const savedBucketIsPlaceholder = ['yeladim-centers-staging', 'yeladim-dev', ''].includes(saved.bucket || '');
  const savedEndpointIsPlaceholder = ['https://nyc3.digitaloceanspaces.com', ''].includes(saved.endpoint || '');
  const savedRegionIsPlaceholder = ['nyc3', ''].includes(saved.region || '');
  return {
    provider: saved.provider || storageProvider,
    bucket: savedBucketIsPlaceholder && storageBucket ? storageBucket : saved.bucket || storageBucket,
    region: savedRegionIsPlaceholder && storageRegion ? storageRegion : saved.region || storageRegion,
    endpoint: savedEndpointIsPlaceholder && storageEndpoint ? storageEndpoint : saved.endpoint || storageEndpoint,
    cdnUrl: saved.cdnUrl || saved.cdn_url || storageCdnUrl,
  };
}

function presignStoragePutUrl({key, storageConfig, expires = 900}) {
  if (!storageAccessKeyId || !storageSecretAccessKey || !storageConfig.bucket) {
    return null;
  }

  const endpointUrl = new URL(storageConfig.endpoint);
  const host = endpointUrl.host;
  const uploadHeaders = storageConfig.cdnUrl ? {'x-amz-acl': 'public-read'} : {};
  const signedHeaders = ['host', ...Object.keys(uploadHeaders).sort()];
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${storageConfig.region}/s3/aws4_request`;
  const canonicalUri = `${endpointUrl.pathname.replace(/\/$/, '')}/${storageConfig.bucket}/${encodeS3Path(key)}`;
  const query = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${storageAccessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': signedHeaders.join(';'),
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map(name => `${encodeRfc3986(name)}=${encodeRfc3986(query[name])}`)
    .join('&');
  const canonicalHeaders = [
    `host:${host}`,
    ...Object.keys(uploadHeaders)
      .sort()
      .map(name => `${name}:${uploadHeaders[name]}`),
    '',
  ].join('\n');
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders.join(';'),
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const signingKey = getAwsSigningKey(storageSecretAccessKey, dateStamp, storageConfig.region, 's3');
  const signature = hmac(signingKey, stringToSign, 'hex');
  const uploadUrl = `${endpointUrl.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  const fileBaseUrl = storageConfig.cdnUrl || `${endpointUrl.origin}/${storageConfig.bucket}`;

  return {
    upload_url: uploadUrl,
    file_url: `${fileBaseUrl.replace(/\/$/, '')}/${encodeS3Path(key)}`,
    headers: uploadHeaders,
  };
}

function hashInviteCode(code) {
  return crypto.createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
}

function generateInviteCode() {
  return `YL-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const header = base64url(JSON.stringify({alg: 'HS256', typ: 'JWT'}));
  const body = base64url(JSON.stringify({...payload, iat: Math.floor(Date.now() / 1000)}));
  const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) {
    return null;
  }
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) {
    return null;
  }
  const expected = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

function getMessageKey(centerId, conversationId) {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY || jwtSecret;
  return crypto.createHash('sha256').update(`${secret}:${centerId}:${conversationId}`).digest();
}

function encryptMessage(centerId, conversationId, plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMessageKey(centerId, conversationId), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    auth_tag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptMessage(centerId, conversationId, record) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getMessageKey(centerId, conversationId),
    Buffer.from(record.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(record.auth_tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

async function loadDb() {
  const pool = await getPgPool();
  if (pool) {
    await ensurePostgresStore(pool);
    const result = await pool.query('SELECT value FROM yeladim_app_state WHERE key = $1', ['main']);
    return result.rows[0]?.value || structuredClone(defaultDb);
  }

  await mkdir(dataDir, {recursive: true});
  if (!existsSync(dbPath)) {
    await writeFile(dbPath, JSON.stringify(defaultDb, null, 2));
    return structuredClone(defaultDb);
  }
  return JSON.parse(await readFile(dbPath, 'utf8'));
}

async function saveDb(db) {
  const pool = await getPgPool();
  if (pool) {
    await ensurePostgresStore(pool);
    await pool.query(
      `
        UPDATE yeladim_app_state
        SET value = $1::jsonb, updated_at = NOW()
        WHERE key = 'main'
      `,
      [JSON.stringify(db)],
    );
    return;
  }

  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

async function ensureBootstrapOwner(db) {
  db.activities = Array.isArray(db.activities) ? db.activities : [];
  const existingActivityIds = new Set(db.activities.map(activity => String(activity.id)));
  const missingDemoActivities = demoActivities.filter(activity => !existingActivityIds.has(String(activity.id)));
  if (missingDemoActivities.length) {
    db.activities.push(...missingDemoActivities);
  }
  db.media_objects = Array.isArray(db.media_objects) ? db.media_objects : [];
  db.messages = Array.isArray(db.messages) ? db.messages : [];
  db.push_tokens = Array.isArray(db.push_tokens) ? db.push_tokens : [];
  db.owner_settings = db.owner_settings || defaultDb.owner_settings;

  if (!bootstrapOwnerEmail || !bootstrapOwnerPassword) {
    return Boolean(missingDemoActivities.length);
  }
  const email = bootstrapOwnerEmail.toLowerCase();
  const existing = db.users.find(user => user.email.toLowerCase() === email);
  if (existing) {
    const nextRoles = new Set([...(existing.roles || []), 'owner']);
    existing.roles = [...nextRoles];
    existing.full_name = existing.full_name || bootstrapOwnerName;
    existing.password_hash = hashPassword(bootstrapOwnerPassword);
    return true;
  }
  db.users.push({
    id: createId('owner'),
    center_id: null,
    email: bootstrapOwnerEmail,
    full_name: bootstrapOwnerName,
    password_hash: hashPassword(bootstrapOwnerPassword),
    roles: ['owner'],
    created_at: new Date().toISOString(),
  });
  return true;
}

function sendJson(res, status, body, origin) {
  const allowedOrigin = allowedOrigins.has(origin) ? origin : [...allowedOrigins][0];
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Yeladim-Center-ID',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function requireAuth(req, db) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }
  const user = db.users.find(candidate => candidate.id === payload.sub);
  return user ? {...payload, user} : null;
}

function requireAppAuth(req, db) {
  const auth = requireAuth(req, db);
  if (auth) {
    return auth;
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (String(token || '').startsWith('demo-')) {
    return {
      sub: token,
      center_id: 'center_demo',
      roles: token.includes('teacher') ? ['teacher'] : token.includes('admin') ? ['admin'] : ['parent'],
      user: {id: token, email: `${token}@demo.local`},
      demo: true,
    };
  }
  return null;
}

function getActivityTitle(type) {
  const titleMap = {
    check_in: 'Check-In',
    lunch: 'Lunch logged',
    snack: 'Snack logged',
    nap: 'Nap Time',
    nap_start: 'Nap started',
    nap_end: 'Nap ended',
    diaper: 'Diaper change',
    potty: 'Potty update',
    art: 'Art & Creativity',
    painting: 'Painting',
    reading: 'Reading',
    playground: 'Playground',
    play: 'Play Time',
    walk: 'Walk',
    other: 'Activity update',
  };
  return titleMap[type] || 'Activity update';
}

function requireOwner(req, db) {
  const auth = requireAuth(req, db);
  return auth?.roles?.includes('owner') ? auth : null;
}

function validateInvite(db, code) {
  const codeHash = hashInviteCode(code);
  const invite = db.invite_codes.find(candidate => candidate.code_hash === codeHash);
  if (!invite || invite.disabled_at) {
    return {valid: false, reason: 'Invalid authorization code'};
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return {valid: false, reason: 'Authorization code expired'};
  }
  if (invite.max_uses && invite.used_count >= invite.max_uses) {
    return {valid: false, reason: 'Authorization code has already been used'};
  }
  const center = db.centers.find(candidate => candidate.id === invite.center_id);
  return {valid: true, invite, center};
}

function audit(db, actor, action, target, metadata = {}) {
  db.audit_events.unshift({
    id: createId('audit'),
    actor,
    action,
    target,
    metadata,
    created_at: new Date().toISOString(),
  });
}

function formatLeadEmail(lead) {
  return [
    `New Yeladim ${lead.requestType} request`,
    '',
    `Name: ${lead.fullName}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || 'Not provided'}`,
    `Center: ${lead.centerName}`,
    `Role: ${lead.role || 'Not provided'}`,
    `Number of centers: ${lead.centers || '1'}`,
    '',
    'Message:',
    lead.message || 'No extra message provided.',
  ].join('\n');
}

async function sendSalesLeadEmail(lead) {
  if (!resendApiKey) {
    return {sent: false, reason: 'email_provider_not_configured'};
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: salesFromEmail,
      to: [salesEmail],
      reply_to: lead.email,
      subject: `Yeladim ${lead.requestType} request from ${lead.centerName || lead.fullName}`,
      text: formatLeadEmail(lead),
    }),
  });

  if (!response.ok) {
    return {sent: false, reason: 'email_provider_rejected'};
  }

  return {sent: true};
}

function buildSession(db, user) {
  const centers = user.center_id
    ? db.centers.filter(center => center.id === user.center_id)
    : [];
  return {
    token: signToken({sub: user.id, center_id: user.center_id, roles: user.roles}),
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      center_id: user.center_id,
    },
    roles: user.roles,
    centers,
    active_center: centers[0] || null,
    kids: [],
  };
}

async function route(req, res) {
  const origin = req.headers.origin;
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {}, origin);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'yeladim-api',
        database_configured: Boolean(databaseUrl),
        storage_provider: storageProvider,
      }, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health/db') {
      const startedAt = Date.now();
      const pool = await getPgPool();
      if (!pool) {
        sendJson(res, 200, {
          ok: true,
          database: 'local-json-fallback',
          configured: false,
        }, origin);
        return;
      }
      const result = await pool.query('SELECT NOW() AS now');
      sendJson(res, 200, {
        ok: true,
        database: 'postgres',
        connected: true,
        now: result.rows[0].now,
        latency_ms: Date.now() - startedAt,
      }, origin);
      return;
    }

    const db = await loadDb();
    if (await ensureBootstrapOwner(db)) {
      await saveDb(db);
    }

    if (req.method === 'GET' && url.pathname === '/health/auth') {
      sendJson(res, 200, {
        ok: true,
        owner_bootstrap_configured: Boolean(bootstrapOwnerEmail && bootstrapOwnerPassword),
        owner_users: db.users.filter(user => (user.roles || []).includes('owner')).length,
        owner_login_ready: Boolean(
          bootstrapOwnerEmail
          && bootstrapOwnerPassword
          && db.users.some(user =>
            user.email.toLowerCase() === bootstrapOwnerEmail.toLowerCase()
            && (user.roles || []).includes('owner'),
          ),
        ),
      }, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
      const body = await readJson(req);
      const user = db.users.find(candidate => candidate.email.toLowerCase() === String(body.email || '').toLowerCase());
      if (!user || !verifyPassword(body.password || '', user.password_hash)) {
        sendJson(res, 401, {error: 'Invalid email or password'}, origin);
        return;
      }
      sendJson(res, 200, buildSession(db, user), origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/auth/validate-invite-code') {
      const body = await readJson(req);
      const result = validateInvite(db, body.code);
      sendJson(res, result.valid ? 200 : 400, result.valid ? {
        valid: true,
        center: result.center,
        role: result.invite.role,
        type: result.invite.type,
      } : {valid: false, error: result.reason}, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/auth/signup') {
      const body = await readJson(req);
      const inviteResult = validateInvite(db, body.code);
      if (!inviteResult.valid) {
        sendJson(res, 400, {error: inviteResult.reason}, origin);
        return;
      }
      if (db.users.some(user => user.email.toLowerCase() === String(body.email || '').toLowerCase())) {
        sendJson(res, 409, {error: 'Email already exists'}, origin);
        return;
      }
      const user = {
        id: createId('user'),
        center_id: inviteResult.invite.center_id,
        email: body.email,
        full_name: body.full_name,
        password_hash: hashPassword(body.password),
        roles: [inviteResult.invite.role],
        created_at: new Date().toISOString(),
      };
      inviteResult.invite.used_count += 1;
      db.users.push(user);
      audit(db, user.email, 'signup', inviteResult.center.name, {role: inviteResult.invite.role});
      await saveDb(db);
      sendJson(res, 201, buildSession(db, user), origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/centers') {
      const auth = requireAuth(req, db);
      if (!auth) {
        sendJson(res, 401, {error: 'Authentication required'}, origin);
        return;
      }
      const centers = auth.center_id
        ? db.centers.filter(center => center.id === auth.center_id)
        : db.centers;
      sendJson(res, 200, {centers, active_center: centers[0] || null}, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/kids') {
      const auth = requireAuth(req, db);
      if (!auth) {
        sendJson(res, 401, {error: 'Authentication required'}, origin);
        return;
      }
      sendJson(res, 200, {kids: []}, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/settings') {
      const auth = requireAuth(req, db);
      if (!auth) {
        sendJson(res, 401, {error: 'Authentication required'}, origin);
        return;
      }
      sendJson(res, 200, {settings: {show_read_receipts: true}}, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/activities') {
      const auth = requireAppAuth(req, db);
      if (!auth) {
        sendJson(res, 401, {error: 'Authentication required'}, origin);
        return;
      }
      const kidId = url.searchParams.get('kid_id');
      const page = Math.max(1, Number(url.searchParams.get('page') || 1));
      const perPage = Math.max(1, Math.min(50, Number(url.searchParams.get('per_page') || 15)));
      const centerId = auth.center_id || url.searchParams.get('center_id') || 'center_demo';
      const all = (db.activities || [])
        .filter(activity => String(activity.center_id || centerId) === String(centerId))
        .filter(activity => !kidId || String(activity.kid_id) === String(kidId))
        .sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));
      const start = (page - 1) * perPage;
      sendJson(res, 200, {
        items: all.slice(start, start + perPage),
        has_more: start + perPage < all.length,
      }, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/activities') {
      const auth = requireAppAuth(req, db);
      if (!auth) {
        sendJson(res, 401, {error: 'Authentication required'}, origin);
        return;
      }
      const body = await readJson(req);
      const centerId = auth.center_id || body.center_id || 'center_demo';
      const timestamp = body.timestamp || body.occurred_at || new Date().toISOString();
      const activity = {
        id: createId('activity'),
        center_id: centerId,
        kid_id: body.kid_id,
        type: body.type || 'other',
        title: body.title || getActivityTitle(body.type),
        description: body.description || '',
        timestamp,
        occurred_at: timestamp,
        file_url: body.file_url || undefined,
        file_urls: Array.isArray(body.file_urls) ? body.file_urls : undefined,
        media_type: body.media_type || (body.file_url || body.file_urls?.length ? 'image' : undefined),
        global: Boolean(body.global),
        created_by: auth.sub,
        created_at: new Date().toISOString(),
      };
      db.activities = Array.isArray(db.activities) ? db.activities : [];
      db.activities.unshift(activity);
      audit(db, auth.user?.email || auth.sub, 'activity_created', String(activity.kid_id), {
        center_id: centerId,
        type: activity.type,
        demo: Boolean(auth.demo),
      });
      await saveDb(db);
      sendJson(res, 201, activity, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/owner/centers') {
      if (!requireOwner(req, db)) {
        sendJson(res, 403, {error: 'Owner access required'}, origin);
        return;
      }
      sendJson(res, 200, {centers: db.centers}, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/owner/centers') {
      const auth = requireOwner(req, db);
      if (!auth) {
        sendJson(res, 403, {error: 'Owner access required'}, origin);
        return;
      }
      const body = await readJson(req);
      const center = {
        id: createId('center'),
        public_id: body.public_id || `CTR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        name: body.name,
        billing_email: body.billing_email || '',
        status: 'active',
        created_at: new Date().toISOString(),
      };
      db.centers.push(center);
      audit(db, auth.user.email, 'center_created', center.name);
      await saveDb(db);
      sendJson(res, 201, {center}, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/owner/invite-codes') {
      if (!requireOwner(req, db)) {
        sendJson(res, 403, {error: 'Owner access required'}, origin);
        return;
      }
      sendJson(res, 200, {
        invite_codes: db.invite_codes.map(invite => ({...invite, code_hash: undefined})),
      }, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/owner/invite-codes') {
      const auth = requireOwner(req, db);
      if (!auth) {
        sendJson(res, 403, {error: 'Owner access required'}, origin);
        return;
      }
      const body = await readJson(req);
      const rawCode = body.code || generateInviteCode();
      const invite = {
        id: createId('invite'),
        center_id: body.center_id,
        code_hash: hashInviteCode(rawCode),
        label: body.label || 'General invite',
        type: body.type || 'temporary',
        role: body.role || 'parent',
        expires_at: body.type === 'permanent' ? null : body.expires_at || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        max_uses: body.type === 'permanent' ? body.max_uses || null : body.max_uses || 1,
        used_count: 0,
        disabled_at: null,
        created_at: new Date().toISOString(),
      };
      db.invite_codes.push(invite);
      audit(db, auth.user.email, 'invite_code_created', invite.center_id, {role: invite.role, type: invite.type});
      await saveDb(db);
      sendJson(res, 201, {invite_code: {...invite, code_hash: undefined, code: rawCode}}, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/public/leads') {
      const body = await readJson(req);
      const lead = {
        id: createId('lead'),
        requestType: body.requestType || 'Demo',
        fullName: body.fullName,
        email: body.email,
        phone: body.phone || '',
        centerName: body.centerName,
        role: body.role || '',
        centers: body.centers || '1',
        message: body.message || '',
        status: 'New',
        source: 'Public website',
        createdAt: new Date().toISOString(),
        sales_email: salesEmail,
      };
      db.leads.unshift(lead);
      audit(db, 'public_site', 'lead_created', lead.centerName, {email: lead.email});
      await saveDb(db);
      let emailDelivery = {sent: false, reason: 'email_provider_not_configured'};
      try {
        emailDelivery = await sendSalesLeadEmail(lead);
      } catch (error) {
        console.error('Could not send lead email', error);
        emailDelivery = {sent: false, reason: 'email_delivery_failed'};
      }
      sendJson(res, 201, {lead, email_to: salesEmail, email_delivery: emailDelivery}, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/owner/leads') {
      if (!requireOwner(req, db)) {
        sendJson(res, 403, {error: 'Owner access required'}, origin);
        return;
      }
      sendJson(res, 200, {leads: db.leads}, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/owner/users') {
      if (!requireOwner(req, db)) {
        sendJson(res, 403, {error: 'Owner access required'}, origin);
        return;
      }
      sendJson(res, 200, {
        users: db.users
          .filter(user => (user.roles || []).includes('owner'))
          .map(user => ({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            roles: user.roles,
            created_at: user.created_at,
          })),
      }, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/owner/settings') {
      if (!requireOwner(req, db)) {
        sendJson(res, 403, {error: 'Owner access required'}, origin);
        return;
      }
      sendJson(res, 200, {settings: db.owner_settings || defaultDb.owner_settings}, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/owner/settings') {
      const auth = requireOwner(req, db);
      if (!auth) {
        sendJson(res, 403, {error: 'Owner access required'}, origin);
        return;
      }
      const body = await readJson(req);
      db.owner_settings = {
        ...(db.owner_settings || defaultDb.owner_settings),
        storage_settings: {
          ...((db.owner_settings || defaultDb.owner_settings).storage_settings || {}),
          ...(body.storage_settings || body.storageSettings || {}),
        },
        updated_at: new Date().toISOString(),
        updated_by: auth.user.email,
      };
      audit(db, auth.user.email, 'owner_settings_updated', 'Owner settings', {
        storage_provider: db.owner_settings.storage_settings.provider,
      });
      await saveDb(db);
      sendJson(res, 200, {settings: db.owner_settings}, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/owner/users') {
      const auth = requireOwner(req, db);
      if (!auth) {
        sendJson(res, 403, {error: 'Owner access required'}, origin);
        return;
      }
      const body = await readJson(req);
      if (db.users.some(user => user.email.toLowerCase() === String(body.email || '').toLowerCase())) {
        sendJson(res, 409, {error: 'Email already exists'}, origin);
        return;
      }
      const roles = [...new Set(['owner', ...(Array.isArray(body.roles) ? body.roles : [])])];
      const user = {
        id: createId('owner_user'),
        center_id: null,
        email: body.email,
        full_name: body.full_name,
        password_hash: hashPassword(body.password),
        roles,
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
      audit(db, auth.user.email, 'owner_user_created', user.email, {roles});
      await saveDb(db);
      sendJson(res, 201, {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          roles: user.roles,
          created_at: user.created_at,
        },
      }, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/messages') {
      const auth = requireAuth(req, db);
      if (!auth) {
        sendJson(res, 401, {error: 'Authentication required'}, origin);
        return;
      }
      const body = await readJson(req);
      const centerId = auth.center_id || body.center_id;
      const encrypted = encryptMessage(centerId, body.conversation_id, body.message);
      const record = {
        id: createId('msg'),
        center_id: centerId,
        conversation_id: body.conversation_id,
        sender_id: auth.sub,
        ...encrypted,
        created_at: new Date().toISOString(),
      };
      db.messages.push(record);
      await saveDb(db);
      sendJson(res, 201, {message: {...record, ciphertext: undefined, encrypted: true}}, origin);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/v1/messages') {
      const auth = requireAuth(req, db);
      if (!auth) {
        sendJson(res, 401, {error: 'Authentication required'}, origin);
        return;
      }
      const centerId = auth.center_id || url.searchParams.get('center_id');
      const messages = db.messages
        .filter(message => message.center_id === centerId)
        .map(message => ({
          id: message.id,
          center_id: message.center_id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          message: decryptMessage(message.center_id, message.conversation_id, message),
          created_at: message.created_at,
        }));
      sendJson(res, 200, {messages}, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/uploads/presign') {
      const auth = requireAppAuth(req, db);
      if (!auth) {
        sendJson(res, 401, {error: 'Authentication required'}, origin);
        return;
      }
      const body = await readJson(req);
      const centerId = auth.center_id || body.center_id;
      const filename = sanitizeFilename(body.filename);
      const s3Key = `centers/${centerId}/uploads/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${filename}`;
      const runtimeStorage = getRuntimeStorageSettings(db);
      const signedUpload = presignStoragePutUrl({key: s3Key, storageConfig: runtimeStorage});
      if (!signedUpload) {
        sendJson(res, 500, {
          error: 'Media storage is not configured. Add STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, and STORAGE_BUCKET.',
        }, origin);
        return;
      }
      const mediaObject = {
        id: createId('media'),
        center_id: centerId,
        provider: runtimeStorage.provider,
        bucket: runtimeStorage.bucket,
        region: runtimeStorage.region,
        s3_key: s3Key,
        file_url: signedUpload.file_url,
        mime_type: body.mime_type || body.content_type || '',
        created_by: auth.sub,
        created_at: new Date().toISOString(),
      };
      db.media_objects = db.media_objects || [];
      db.media_objects.push(mediaObject);
      await saveDb(db);
      sendJson(res, 200, {
        provider: runtimeStorage.provider,
        bucket: runtimeStorage.bucket,
        region: runtimeStorage.region,
        endpoint: runtimeStorage.endpoint,
        upload_url: signedUpload.upload_url,
        method: 'PUT',
        file_url: signedUpload.file_url,
        headers: signedUpload.headers,
        s3_key: s3Key,
        expires_in: 900,
      }, origin);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/push/register') {
      const auth = requireAuth(req, db);
      if (!auth) {
        sendJson(res, 401, {error: 'Authentication required'}, origin);
        return;
      }
      const body = await readJson(req);
      db.push_tokens = db.push_tokens.filter(token => token.token !== body.token);
      db.push_tokens.push({
        id: createId('push'),
        user_id: auth.sub,
        center_id: auth.center_id,
        token: body.token,
        platform: body.platform,
        created_at: new Date().toISOString(),
      });
      await saveDb(db);
      sendJson(res, 201, {ok: true}, origin);
      return;
    }

    sendJson(res, 404, {error: 'Route not found'}, origin);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, {error: 'Internal server error'}, origin);
  }
}

createServer(route).listen(port, host, () => {
  console.log(`Yeladim API listening on http://${host}:${port}`);
});
