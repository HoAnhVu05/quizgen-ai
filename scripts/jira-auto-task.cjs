/**
 * QuizGen AI - Jira Automated Issue Creation & Transition Tool
 * Tự động tạo task Jira -> gán vào Active Sprint -> Assign cho chính mình -> lấy mã SCRUM-xx -> commit & push Git -> chuyển task sang Done.
 */
const fs = require('fs');
const path = require('path');

const JIRA_DOMAIN = 'ut-team-quizgen-ai.atlassian.net';
const JIRA_PROJECT_KEY = 'SCRUM';

function getJiraCredentials() {
  let email = process.env.JIRA_EMAIL || '';
  let token = process.env.JIRA_API_TOKEN || '';

  if (!email || !token) {
    try {
      const envPath = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const matchEmail = content.match(/JIRA_EMAIL=([^\r\n]+)/);
        const matchToken = content.match(/JIRA_API_TOKEN=([^\r\n]+)/);
        if (matchEmail) email = matchEmail[1].trim();
        if (matchToken) token = matchToken[1].trim();
      }
    } catch {}
  }
  return { email, token };
}

async function getMyself(authHeader) {
  try {
    const res = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/myself`, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

async function getActiveSprint(authHeader) {
  try {
    const res = await fetch(`https://${JIRA_DOMAIN}/rest/agile/1.0/board?projectKeyOrId=${JIRA_PROJECT_KEY}`, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const boards = await res.json();
    const boardId = boards.values?.[0]?.id;
    if (!boardId) return null;

    const resSprints = await fetch(`https://${JIRA_DOMAIN}/rest/agile/1.0/board/${boardId}/sprint?state=active`, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });
    if (!resSprints.ok) return null;
    const sprints = await resSprints.json();
    return sprints.values?.[0] || null;
  } catch {}
  return null;
}

async function createJiraIssue({ summary, description, issueType = 'Task' }) {
  const { email, token } = getJiraCredentials();
  if (!email || !token) {
    throw new Error('Thiếu JIRA_EMAIL hoặc JIRA_API_TOKEN trong file .env. Hãy thêm vào để tự động hóa tạo task Jira.');
  }

  const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
  
  // 1. Lấy thông tin user
  const myself = await getMyself(authHeader);

  const payload = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: description || summary }]
          }
        ]
      },
      issuetype: { name: issueType }
    }
  };

  if (myself?.accountId) {
    payload.fields.assignee = { accountId: myself.accountId };
  }

  const res = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi tạo Jira Issue (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  const issueKey = data.key;

  // 2. Gán vào Active Sprint nếu có
  const activeSprint = await getActiveSprint(authHeader);
  if (activeSprint?.id) {
    try {
      await fetch(`https://${JIRA_DOMAIN}/rest/agile/1.0/sprint/${activeSprint.id}/issue`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ issues: [issueKey] })
      });
      console.log(`[Jira] Đã đưa ${issueKey} vào active sprint: ${activeSprint.name}`);
    } catch {}
  }

  return issueKey;
}

async function transitionIssueToDone(issueKey) {
  const { email, token } = getJiraCredentials();
  if (!email || !token) return;

  const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
  
  // 1. Lấy danh sách transitions có sẵn
  const res = await fetch(`https://${JIRA_DOMAIN}/rest/api/3/issue/${issueKey}/transitions`, {
    headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
  });
  if (!res.ok) return;

  const data = await res.json();
  const doneTransition = (data.transitions || []).find((t) => 
    t.name.toLowerCase().includes('done') || 
    t.name.toLowerCase().includes('hoàn thành') ||
    t.to?.name?.toLowerCase().includes('done')
  );

  if (doneTransition) {
    await fetch(`https://${JIRA_DOMAIN}/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transition: { id: doneTransition.id } })
    });
    console.log(`[Jira] Đã chuyển task ${issueKey} sang Done.`);
  }
}

module.exports = {
  createJiraIssue,
  transitionIssueToDone,
  getJiraCredentials
};

// Chạy trực tiếp từ dòng lệnh
if (require.main === module) {
  const summary = process.argv[2] || 'Test task from QuizGen agent';
  const desc = process.argv[3] || summary;

  createJiraIssue({ summary, description: desc })
    .then((key) => {
      console.log(`SUCCESS:${key}`);
    })
    .catch((err) => {
      console.error(`ERROR:${err.message}`);
      process.exit(1);
    });
}
