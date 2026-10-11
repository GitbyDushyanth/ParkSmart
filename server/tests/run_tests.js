import pool from '../db/pool.js';
import app from '../index.js';

const PORT = 3099;
const BASE = `http://localhost:${PORT}/api`;
let server;

async function runTests() {
  console.log('====================================================');
  console.log('   PARKSMART FULL-STACK ENHANCEMENT TEST SUITE');
  console.log('====================================================\n');

  // Start app on test port
  server = app.listen(PORT);
  await new Promise(r => setTimeout(r, 800));

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // 1. HEALTH CHECK
    // ----------------------------------------------------
    console.log('[1] Health & Database Connectivity');
    const healthRes = await fetch(`${BASE}/health`);
    const healthData = await healthRes.json();
    assert('GET /api/health returns 200 and healthy DB', healthRes.status === 200 && healthData.status === 'healthy');

    // ----------------------------------------------------
    // 2. UNAUTHENTICATED REQUESTS (SECURITY: 401)
    // ----------------------------------------------------
    console.log('\n[2] Security: Unauthenticated Access (Must be 401)');

    const unauthMine = await fetch(`${BASE}/reservations/mine`);
    assert('GET /api/reservations/mine without token returns 401', unauthMine.status === 401);

    const unauthDashboard = await fetch(`${BASE}/dashboard/stats`);
    assert('GET /api/dashboard/stats without token returns 401', unauthDashboard.status === 401);

    const unauthUsers = await fetch(`${BASE}/users`);
    assert('GET /api/users without token returns 401', unauthUsers.status === 401);

    const unauthProfile = await fetch(`${BASE}/auth/me`);
    assert('GET /api/auth/me without token returns 401', unauthProfile.status === 401);

    const invalidTokenRes = await fetch(`${BASE}/reservations/mine`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' }
    });
    assert('Invalid token returns 401', invalidTokenRes.status === 401);

    // ----------------------------------------------------
    // 3. ADMIN LOGIN & TOKEN ACQUISITION
    // ----------------------------------------------------
    console.log('\n[3] Admin Authentication');
    const adminLoginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@parksmart.local', password: 'ParkSmart@123' })
    });
    const adminLoginData = await adminLoginRes.json();
    assert('Admin login succeeds with 200', adminLoginRes.status === 200);
    assert('Admin token provided', !!adminLoginData.token);
    assert('Admin user role is admin', adminLoginData.user?.role === 'admin');
    const adminToken = adminLoginData.token;

    // ----------------------------------------------------
    // 4. DRIVER REGISTRATION & PRIVILEGE ESCALATION PREVENTION
    // ----------------------------------------------------
    console.log('\n[4] Driver Registration & Role Integrity');
    const testDriverEmail = `test_driver_${Date.now()}@parksmart.local`;
    const regRes = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sprint Test Driver',
        email: testDriverEmail,
        password: 'Password123!',
        role: 'admin' // Attempt privilege escalation!
      })
    });
    const regData = await regRes.json();
    assert('Registration succeeds with 201', regRes.status === 201);
    assert('Privilege Escalation Blocked: Role forced to user', regData.user?.role === 'user');
    assert('Password hash not leaked in registration response', !regData.user?.password_hash && !regData.user?.password);
    const driverToken = regData.token;
    const driverId = regData.user.id;

    // ----------------------------------------------------
    // 5. ROLE-BASED ACCESS CONTROL (NORMAL USER FORBIDDEN: 403)
    // ----------------------------------------------------
    console.log('\n[5] Security: Driver Access to Admin Endpoints (Must be 403)');

    const driverStatsRes = await fetch(`${BASE}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert('Driver accessing /api/dashboard/stats returns 403 Forbidden', driverStatsRes.status === 403);

    const driverUsersRes = await fetch(`${BASE}/users`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert('Driver accessing /api/users returns 403 Forbidden', driverUsersRes.status === 403);

    const driverCreateSlotRes = await fetch(`${BASE}/slots`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_number: 'TEST-99' })
    });
    assert('Driver creating parking slot returns 403 Forbidden', driverCreateSlotRes.status === 403);

    const driverSlotStatusRes = await fetch(`${BASE}/slots/1/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'maintenance' })
    });
    assert('Driver updating slot status returns 403 Forbidden', driverSlotStatusRes.status === 403);

    const driverViewOtherRes = await fetch(`${BASE}/users/1`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert('Driver viewing another user details returns 403 Forbidden', driverViewOtherRes.status === 403);

    const driverRoleChangeRes = await fetch(`${BASE}/users/${driverId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' })
    });
    assert('Driver changing role returns 403 Forbidden', driverRoleChangeRes.status === 403);

    // ----------------------------------------------------
    // 6. USER PROFILE & ACCOUNT MANAGEMENT
    // ----------------------------------------------------
    console.log('\n[6] User Profiles & Account Management');

    // GET /me
    const meRes = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const meData = await meRes.json();
    assert('Driver GET /api/auth/me returns 200', meRes.status === 200);
    assert('Profile includes user information', meData.user?.email === testDriverEmail);
    assert('Profile includes reservation statistics object', typeof meData.stats?.total === 'number');

    // PUT /profile
    const updateProfileRes = await fetch(`${BASE}/auth/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Driver Name',
        role: 'admin', // Malicious attempt to self-promote
        id: 1 // Malicious attempt to change id
      })
    });
    const updateProfileData = await updateProfileRes.json();
    assert('Driver PUT /api/auth/profile succeeds with 200', updateProfileRes.status === 200);
    assert('Name updated successfully', updateProfileData.user?.name === 'Updated Driver Name');
    assert('Privilege escalation blocked: Role remains user', updateProfileData.user?.role === 'user');
    assert('ID remains unchanged', updateProfileData.user?.id === driverId);

    // Password change tests
    const wrongPassRes = await fetch(`${BASE}/auth/change-password`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword123!' })
    });
    assert('Change password with wrong current password returns 400', wrongPassRes.status === 400);

    const shortPassRes = await fetch(`${BASE}/auth/change-password`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'Password123!', newPassword: '123' })
    });
    assert('Change password with short new password returns 400', shortPassRes.status === 400);

    const validPassRes = await fetch(`${BASE}/auth/change-password`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'Password123!', newPassword: 'BrandNewPassword123!' })
    });
    assert('Change password with valid credentials succeeds with 200', validPassRes.status === 200);

    // Verify login with new password
    const newLoginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testDriverEmail, password: 'BrandNewPassword123!' })
    });
    assert('Login with updated password succeeds', newLoginRes.status === 200);

    // ----------------------------------------------------
    // 7. ADMIN USER MANAGEMENT
    // ----------------------------------------------------
    console.log('\n[7] Admin User Management');

    const adminListUsersRes = await fetch(`${BASE}/users?search=Updated&role=user`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminListUsersData = await adminListUsersRes.json();
    assert('Admin GET /api/users returns 200', adminListUsersRes.status === 200);
    assert('User listing contains pagination', typeof adminListUsersData.pagination?.total === 'number');
    assert('User listing contains filtered user by updated name', adminListUsersData.users.some(u => u.email === testDriverEmail));
    assert('Password hashes not exposed in user listing', adminListUsersData.users.every(u => !u.password_hash));

    // Admin view specific user details
    const userDetailRes = await fetch(`${BASE}/users/${driverId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const userDetailData = await userDetailRes.json();
    assert('Admin GET /api/users/:id returns 200', userDetailRes.status === 200);
    assert('User details has stats and reservations array', Array.isArray(userDetailData.reservations));

    // Admin self-demotion protection
    const selfDemoteRes = await fetch(`${BASE}/users/1/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' })
    });
    assert('Admin self-demotion blocked with 400', selfDemoteRes.status === 400);

    // Admin promoting test driver
    const promoteRes = await fetch(`${BASE}/users/${driverId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' })
    });
    assert('Admin can promote user to admin', promoteRes.status === 200);

    // Admin demoting test driver back to user
    const demoteRes = await fetch(`${BASE}/users/${driverId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' })
    });
    assert('Admin can demote user back to user', demoteRes.status === 200);

    // ----------------------------------------------------
    // 8. ADMIN DASHBOARD & ANALYTICS
    // ----------------------------------------------------
    console.log('\n[8] Admin Dashboard & Analytics');

    const dashRes = await fetch(`${BASE}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dashData = await dashRes.json();
    assert('Admin GET /api/dashboard/stats returns 200', dashRes.status === 200);
    assert('Dashboard has slots metrics', typeof dashData.slots?.total === 'number' && typeof dashData.slots?.available === 'number');
    assert('Dashboard has utilization rate', typeof dashData.slots?.utilizationRate === 'number');
    assert('Dashboard has reservations metrics', typeof dashData.reservations?.active === 'number');
    assert('Dashboard has 7-day timeline data', Array.isArray(dashData.timeline) && dashData.timeline.length === 7);
    assert('Dashboard has recentReservations list', Array.isArray(dashData.recentReservations));

    // ----------------------------------------------------
    // 9. CLEANUP TEST USER
    // ----------------------------------------------------
    console.log('\n[9] Cleanup');
    const deleteRes = await fetch(`${BASE}/users/${driverId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('Admin cleanup: Delete test user succeeds with 200', deleteRes.status === 200);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runTests();
