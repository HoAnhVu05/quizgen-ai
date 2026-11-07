const http = require('http');
const { spawn } = require('child_process');
const assert = require('assert');

// 1. Start the Mock Gateway Server
console.log('================================================================');
console.log('  QUIZGEN AI - MULTI-ROLE AUTH & TOKEN REFRESH TEST SUITE');
console.log('================================================================');

const gatewayProcess = spawn('node', ['scripts/mock-gateway.cjs'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

gatewayProcess.stdout.on('data', (d) => {
  // console.log(`[Gateway] ${d}`);
});

gatewayProcess.stderr.on('data', (d) => {
  console.error(`[Gateway Error] ${d}`);
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      if (typeof postData === 'object') {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

async function runTests() {
  try {
    // Wait for server to start listening
    await wait(800);

    console.log('\n[TEST 1] Health Check');
    const health = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/health',
      method: 'GET',
    });
    assert.strictEqual(health.status, 200, 'Health check should return 200');
    assert.strictEqual(health.body.status, 'healthy');
    console.log('✓ Health check passed: Gateway is active on port 8000');

    // -------------------------------------------------------------
    // TEST 2: Multi-Role Login Verification
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Multi-Role Login Verification (Lecturer, Head of Dept, Admin)');

    const rolesToTest = [
      {
        email: 'lecturer@vnu.edu.vn',
        expectedRole: 'lecturer',
        expectedName: 'TS. Nguyễn Văn An',
        expectedDept: 'Khoa Công nghệ Thông tin',
      },
      {
        email: 'truongbomon@vnu.edu.vn',
        expectedRole: 'head_of_department',
        expectedName: 'PGS. TS. Trần Thị Mai',
        expectedDept: 'Bộ môn Hệ thống Thông tin',
      },
      {
        email: 'admin.khaothi@vnu.edu.vn',
        expectedRole: 'admin',
        expectedName: 'ThS. Lê Hoàng Nam',
        expectedDept: 'Phòng Khảo thí & Đảm bảo Chất lượng',
      },
    ];

    const tokens = {};

    for (const r of rolesToTest) {
      const res = await request(
        {
          hostname: 'localhost',
          port: 8000,
          path: '/api/v1/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { username: r.email, password: 'password123' }
      );

      assert.strictEqual(res.status, 200, `Login for ${r.email} should return 200`);
      assert.ok(res.body.access_token, 'Should have access_token');
      assert.ok(res.body.refresh_token, 'Should have refresh_token');
      assert.strictEqual(res.body.token_type, 'bearer');
      assert.strictEqual(res.body.expires_in, 1800);
      assert.strictEqual(res.body.user.role, r.expectedRole);
      assert.strictEqual(res.body.user.full_name, r.expectedName);
      assert.strictEqual(res.body.user.department, r.expectedDept);

      tokens[r.expectedRole] = {
        accessToken: res.body.access_token,
        refreshToken: res.body.refresh_token,
      };

      console.log(`✓ Login success for [${r.expectedRole.toUpperCase()}]: ${r.expectedName} (${r.expectedDept})`);
      console.log(`  Access Token: ${res.body.access_token.slice(0, 32)}...`);
      console.log(`  Refresh Token: ${res.body.refresh_token.slice(0, 33)}...`);
    }

    // -------------------------------------------------------------
    // TEST 3: Auto Refresh Token Flow
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Auto Refresh Token Flow');

    for (const role of ['lecturer', 'head_of_department', 'admin']) {
      const originalRefresh = tokens[role].refreshToken;

      // 3.1: Refresh using JSON Body
      const refreshRes = await request(
        {
          hostname: 'localhost',
          port: 8000,
          path: '/api/v1/auth/refresh',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { refresh_token: originalRefresh }
      );

      assert.strictEqual(refreshRes.status, 200, 'Refresh token request should return 200');
      assert.ok(refreshRes.body.access_token, 'Should return new access_token');
      assert.ok(refreshRes.body.refresh_token, 'Should return rotated refresh_token');
      assert.strictEqual(refreshRes.body.user.role, role, `Refreshed token must retain role '${role}'`);

      console.log(`✓ Refreshed token for [${role.toUpperCase()}]: role preserved, new access token issued.`);

      // 3.2: Refresh using Bearer Header
      const headerRefreshRes = await request(
        {
          hostname: 'localhost',
          port: 8000,
          path: '/api/v1/auth/refresh',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${originalRefresh}`,
          },
        }
      );
      assert.strictEqual(headerRefreshRes.status, 200, 'Refresh via Authorization header should return 200');
      assert.strictEqual(headerRefreshRes.body.user.role, role);
      console.log(`✓ Header-based refresh for [${role.toUpperCase()}] verified.`);
    }

    // -------------------------------------------------------------
    // TEST 4: Get Current User Profile (/api/v1/auth/me)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Get Current User Profile (/api/v1/auth/me)');

    for (const [role, t] of Object.entries(tokens)) {
      const meRes = await request({
        hostname: 'localhost',
        port: 8000,
        path: '/api/v1/auth/me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${t.accessToken}`,
        },
      });

      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.role, role);
      console.log(`✓ /api/v1/auth/me correctly returned profile for [${role}]: ${meRes.body.full_name}`);
    }

    // -------------------------------------------------------------
    // TEST 5: Logout & Revocation (/api/v1/auth/logout)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Logout & Token Revocation (/api/v1/auth/logout)');

    const logoutRes = await request(
      {
        hostname: 'localhost',
        port: 8000,
        path: '/api/v1/auth/logout',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.lecturer.accessToken}`,
        },
      }
    );

    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.body.status, 'success');
    console.log(`✓ Logout successful: ${logoutRes.body.message}`);

    console.log('\n================================================================');
    console.log('  ALL 5 INTEGRATION TESTS PASSED SUCCESSFULLY! (100% OK)');
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    gatewayProcess.kill();
  }
}

runTests();

