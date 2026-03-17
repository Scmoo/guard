# Client Ordering Portal — Healthcare
## Setup Guide for Beginners

This guide walks you through setting up the complete portal step by step.
No prior experience required — every step is explained.

---

## What You're Building

```
User types login → Auth0 verifies password → Token issued → AWS API checks token → Org data returned → Page displays it
```

You never store passwords yourself. Auth0 handles that securely.

---

## File Structure

```
healthcare-portal/
├── login.html              ← The login page (public)
├── css/
│   └── styles.css          ← All styling / design system
├── js/
│   ├── auth.js             ← Auth0 login/logout helpers
│   ├── api.js              ← AWS API data fetching
│   ├── ui.js               ← Toasts, modals, loaders
│   └── sidebar.js          ← Shared sidebar navigation
└── pages/                  ← All protected pages (require login)
    ├── dashboard.html
    ├── patients.html
    ├── appointments.html
    ├── staff.html
    ├── settings.html
    └── 404.html
```

---

## STEP 1 — Set Up Auth0 (Free)

Auth0 handles login, passwords, and user accounts.

### 1a. Create an Auth0 Account
1. Go to https://auth0.com and sign up (free tier is fine to start)
2. During setup, choose **"I'm building a web app"**

### 1b. Create an Application
1. In the Auth0 dashboard → **Applications** → **Create Application**
2. Name it: `Healthcare Portal`
3. Choose type: **Single Page Application**
4. Click **Create**

### 1c. Get Your Credentials
On the application settings page, copy:
- **Domain** (looks like `dev-abc12345.us.auth0.com`)
- **Client ID** (long random string)

### 1d. Configure Allowed URLs
In the same settings page, fill in:

| Field | Value |
|---|---|
| Allowed Callback URLs | `http://localhost:3000/pages/dashboard.html` |
| Allowed Logout URLs   | `http://localhost:3000/login.html` |
| Allowed Web Origins   | `http://localhost:3000` |

> When you deploy to a real domain, add those URLs too (comma-separated).

### 1e. Create an API (for securing your AWS backend)
1. Auth0 dashboard → **APIs** → **Create API**
2. Name: `Healthcare Portal API`
3. Identifier (Audience): `https://api.yourhealthcareportal.com`
   (This is just a unique string — it doesn't need to be a real URL yet)
4. Click **Create**

### 1f. Set Up Roles (for Admin / Provider / Nurse access)
1. Auth0 dashboard → **User Management** → **Roles**
2. Create three roles: `admin`, `provider`, `nurse`
3. Auth0 dashboard → **Actions** → **Flows** → **Login**
4. Click **+** → **Build Custom** → name it `Add Role to Token`
5. Paste this code:
```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://yourapp.com';
  const roles = event.authorization?.roles || [];
  api.idToken.setCustomClaim(`${namespace}/role`, roles[0] || 'nurse');
  api.accessToken.setCustomClaim(`${namespace}/role`, roles[0] || 'nurse');
};
```
6. Click **Deploy** and drag it into the Login flow

### 1g. Update auth.js
Open `js/auth.js` and replace the CONFIG values:
```javascript
const AUTH_CONFIG = {
  domain:    'dev-abc12345.us.auth0.com',   // ← your Domain
  clientId:  'your_client_id_here',         // ← your Client ID
  audience:  'https://api.yourhealthcareportal.com',  // ← your API Identifier
  ...
};
```

---

## STEP 2 — Set Up AWS

AWS hosts your database and the API that serves data to the portal.

### 2a. Create an AWS Account
1. Go to https://aws.amazon.com → **Create an AWS account**
2. You'll need a credit card (most services used here are free-tier eligible)
3. Choose the **Basic (free)** support plan

### 2b. Create a DynamoDB Database (your patient/org data)
DynamoDB is a simple key-value database — no SQL needed.

1. AWS Console → search **DynamoDB** → **Create table**
2. Create these tables:

| Table Name | Partition Key | Sort Key |
|---|---|---|
| `organizations` | `orgId` (String) | — |
| `patients` | `orgId` (String) | `patientId` (String) |
| `staff` | `orgId` (String) | `staffId` (String) |
| `appointments` | `orgId` (String) | `apptId` (String) |

3. Leave all other settings as default → **Create table**

### 2c. Create a Lambda Function (your API logic)
Lambda functions run code when called — no server to manage.

1. AWS Console → search **Lambda** → **Create function**
2. Choose **Author from scratch**
3. Name: `healthcare-portal-api`
4. Runtime: **Node.js 20.x**
5. Click **Create function**

6. Replace the function code with this starter:

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const https = require('https');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// ── Verify Auth0 JWT token ──────────────────────────────────────
async function verifyToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing token');
  const token = authHeader.split(' ')[1];

  // Decode the token payload (middle part)
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

  // In production: use a proper JWT library (jsonwebtoken + jwks-rsa)
  // to fully verify the signature against Auth0's public keys.
  // npm install jsonwebtoken jwks-rsa

  return payload; // { sub: 'auth0|...', 'https://yourapp.com/role': 'admin', ... }
}

// ── Route handler ───────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://yourdomain.com',  // ← update this
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const user  = await verifyToken(event.headers?.Authorization);
    const orgId = user['https://yourapp.com/orgId'] || 'demo-org';
    const role  = user['https://yourapp.com/role']  || 'nurse';
    const path  = event.path?.replace('/prod', '') || '/';
    const method = event.httpMethod;

    // ── GET /org ──
    if (path === '/org' && method === 'GET') {
      const result = await ddb.send(new GetCommand({
        TableName: 'organizations',
        Key: { orgId },
      }));
      return { statusCode: 200, headers, body: JSON.stringify(result.Item || {}) };
    }

    // ── GET /dashboard/stats ──
    if (path === '/dashboard/stats' && method === 'GET') {
      // Query your tables and return counts
      return { statusCode: 200, headers, body: JSON.stringify({
        totalPatients: 0,
        appointmentsToday: 0,
        monthlyRevenue: 0,
        activeStaff: 0,
        todaysAppointments: [],
      })};
    }

    // ── GET /patients ──
    if (path === '/patients' && method === 'GET') {
      const result = await ddb.send(new QueryCommand({
        TableName: 'patients',
        KeyConditionExpression: 'orgId = :orgId',
        ExpressionAttributeValues: { ':orgId': orgId },
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ patients: result.Items }) };
    }

    // ── GET /staff ──
    if (path === '/staff' && method === 'GET') {
      if (role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ message: 'Forbidden' }) };
      const result = await ddb.send(new QueryCommand({
        TableName: 'staff',
        KeyConditionExpression: 'orgId = :orgId',
        ExpressionAttributeValues: { ':orgId': orgId },
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ staff: result.Items }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ message: 'Not found' }) };

  } catch (err) {
    console.error(err);
    const status = err.message === 'Missing token' ? 401 : 500;
    return { statusCode: status, headers, body: JSON.stringify({ message: err.message }) };
  }
};
```

7. Click **Deploy**

### 2d. Create an API Gateway (public URL for your Lambda)
1. AWS Console → **API Gateway** → **Create API**
2. Choose **HTTP API** → **Build**
3. Click **Add integration** → choose your Lambda function
4. Click **Next** → add route: `ANY /{proxy+}` pointing to your Lambda
5. Click through to **Create**

6. You'll get a URL like: `https://abc123.execute-api.us-east-1.amazonaws.com/prod`

### 2e. Update api.js
Open `js/api.js` and replace:
```javascript
const API_CONFIG = {
  baseUrl: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod',
};
```

### 2f. Give Lambda permission to access DynamoDB
1. AWS Console → **Lambda** → your function → **Configuration** → **Permissions**
2. Click the **Role name** link → **Add permissions** → **Attach policies**
3. Search for `AmazonDynamoDBFullAccess` → **Add permissions**

---

## STEP 3 — Run Locally

You need a simple local web server (browsers block some features when opening files directly).

### Option A — VS Code (easiest)
1. Install VS Code: https://code.visualstudio.com
2. Install the **Live Server** extension
3. Right-click `login.html` → **Open with Live Server**
4. Your browser opens at `http://localhost:5500`

### Option B — Node.js
```bash
npx serve .
# Opens at http://localhost:3000
```

---

## STEP 4 — Create Your First User

1. Auth0 dashboard → **User Management** → **Users** → **Create User**
2. Enter an email and password
3. After creating, go to the user → **Roles** tab → assign `admin`
4. Also set a custom metadata field `orgId` to match an organization in your DynamoDB

---

## STEP 5 — Deploy to the Web (When Ready)

**Easy option: Netlify**
1. Go to https://netlify.com → sign up free
2. Drag your entire `healthcare-portal` folder into the Netlify dashboard
3. You'll get a URL like `https://your-app.netlify.app`
4. Update your Auth0 Allowed URLs with this new domain

---

## Security Checklist (Before Going Live)

- [ ] Enable HTTPS on your domain (Netlify does this automatically)
- [ ] Add proper JWT signature verification in your Lambda (use `jsonwebtoken` + `jwks-rsa`)
- [ ] Enable DynamoDB encryption at rest (default in AWS)
- [ ] Set up AWS CloudTrail for audit logging
- [ ] Sign your HIPAA BAA with AWS (https://aws.amazon.com/compliance/hipaa-compliance/)
- [ ] Restrict API Gateway CORS to your exact domain
- [ ] Enable Auth0 brute-force protection (Settings → Security → Brute-force protection)
- [ ] Set up Auth0 Anomaly Detection

---

## Need Help?

- **Auth0 docs**: https://auth0.com/docs
- **AWS DynamoDB docs**: https://docs.aws.amazon.com/dynamodb
- **AWS Lambda docs**: https://docs.aws.amazon.com/lambda
- **AWS free tier**: https://aws.amazon.com/free
