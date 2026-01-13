# GCADR Editorial API

Serverless API backend for the GCADR Blog Editorial Workflow System.

## Features

- **GitHub-based Data Storage**: All editorial data stored as JSON files in a GitHub repo
- **Email Notifications**: Automated emails via Resend API
- **Google Forms Integration**: Webhook to receive submissions from Google Forms
- **Role-Based Workflow**: CE → AE → SE review chain
- **Full Audit Logging**: Track all editorial actions

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Google Forms   │─────▶│  Vercel API     │─────▶│  GitHub Repo    │
│  (Submissions)  │      │  (Serverless)   │      │  (Data Storage) │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  Resend Email   │
                         │  (Notifications)│
                         └─────────────────┘
```

## API Endpoints

### Submissions
- `GET /api/submissions` - List all submissions
- `POST /api/submissions/create` - Create new submission
- `POST /api/submissions/update-status` - Update submission status

### Editors
- `GET /api/editors` - List all editors
- `POST /api/editors` - Create new editor
- `DELETE /api/editors?editorId=xxx` - Remove editor

### Teams
- `GET /api/teams` - List all teams with stats
- `POST /api/teams` - Create new team
- `PUT /api/teams` - Update team

### Webhooks
- `POST /api/webhooks/google-form` - Receive Google Forms submissions

### Audit
- `GET /api/audit-log` - Get audit log entries

## Setup

### 1. Create GitHub Data Repository

Create a new GitHub repository (e.g., `gcadr-editorial-data`) with:

```
data/
  editors.json     # []
  teams.json       # []
  submissions.json # []
  audit-log.json   # []
```

### 2. Get API Keys

- **GitHub Token**: Create a Personal Access Token with `repo` scope
- **Resend API Key**: Sign up at https://resend.com and get API key

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add GITHUB_TOKEN
vercel env add GITHUB_REPO_OWNER
vercel env add GITHUB_REPO_NAME
vercel env add RESEND_API_KEY

# Deploy to production
vercel --prod
```

### 4. Configure Google Forms

Create a Google Apps Script in your form:

```javascript
function onFormSubmit(e) {
  const formData = {};
  const items = e.response.getItemResponses();
  
  items.forEach(item => {
    formData[item.getItem().getTitle()] = item.getResponse();
  });

  formData.timestamp = e.response.getTimestamp();
  formData.responseId = e.response.getId();

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ formData })
  };

  UrlFetchApp.fetch('https://your-api.vercel.app/api/webhooks/google-form', options);
}
```

Then add a trigger: Edit → Current project's triggers → Add trigger → onFormSubmit → On form submit

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub Personal Access Token with repo access |
| `GITHUB_REPO_OWNER` | GitHub username/org (e.g., `Aravin-dhan`) |
| `GITHUB_REPO_NAME` | Data repo name (e.g., `gcadr-editorial-data`) |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `RESEND_FROM_EMAIL` | From email (default: `noreply@gcadr.in`) |

## Editorial Workflow

1. **Submission** → Author submits via Google Form
2. **CE Review** → Copy Editor checks grammar, plagiarism, formatting
3. **AE Review** → Associate Editor reviews content and flow
4. **SE Review** → Senior Editor gives final approval
5. **Published** → Article goes live on blog

## Statuses

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `submitted` | New submission | Gray |
| `ce_review` | With Copy Editor | Green |
| `ae_review` | With Associate Editor | Blue |
| `se_review` | With Senior Editor | Purple |
| `author_revision` | Sent back for revisions | Orange |
| `approved` | Ready for publication | Green |
| `published` | COMPLETE | Purple |
| `rejected` | Not accepted | Red |

## License

MIT © GCADR, GNLU
