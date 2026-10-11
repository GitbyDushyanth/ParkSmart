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
    // 9. RESERVATION COMPLETION WORKFLOW (END-TO-END)
    // ----------------------------------------------------
    console.log('\n[9] Reservation Completion Workflow');

    // Register second driver for cross-user permission testing
    const testDriver2Email = `test_driver2_${Date.now()}@parksmart.local`;
    const reg2Res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Second Test Driver',
        email: testDriver2Email,
        password: 'Password123!'
      })
    });
    const reg2Data = await reg2Res.json();
    assert('Register second driver succeeds with 201', reg2Res.status === 201);
    const driver2Token = reg2Data.token;
    const driver2Id = reg2Data.user.id;

    // Admin creates dedicated test slots
    const slotNum1 = `CP1-${Date.now().toString().slice(-4)}`;
    const createSlot1Res = await fetch(`${BASE}/slots`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_number: slotNum1, slot_type: 'regular' })
    });
    const createSlot1Data = await createSlot1Res.json();
    assert('Admin creates dedicated test slot 1', createSlot1Res.status === 201);
    const testSlot1Id = createSlot1Data.slot.id;

    // Driver 1 books slot 1
    const book1Res = await fetch(`${BASE}/reservations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: testSlot1Id })
    });
    const book1Data = await book1Res.json();
    assert('Driver 1 books slot 1 successfully', book1Res.status === 201 && book1Data.reservation?.status === 'active');
    const res1Id = book1Data.reservation.id;

    // Verify slot 1 is reserved
    const slotsRes1 = await fetch(`${BASE}/slots`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const slotsData1 = await slotsRes1.json();
    const slot1Before = slotsData1.slots.find(s => s.id === testSlot1Id);
    assert('Slot 1 is marked reserved (is_reserved: true)', slot1Before?.is_reserved === true);

    // Test Security: Unauthenticated request to complete
    const unauthComplete = await fetch(`${BASE}/reservations/${res1Id}/complete`, {
      method: 'PATCH'
    });
    assert('Security: Complete without token returns 401', unauthComplete.status === 401);

    // Test Security: Driver 2 attempts to complete Driver 1's reservation
    const crossDriverComplete = await fetch(`${BASE}/reservations/${res1Id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driver2Token}` }
    });
    assert('Security: Driver 2 completing Driver 1 reservation returns 403 Forbidden', crossDriverComplete.status === 403);

    // Test Invalid / Nonexistent IDs
    const invalidIdComplete = await fetch(`${BASE}/reservations/notanumber/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert('Validation: Complete with non-numeric ID returns 400', invalidIdComplete.status === 400);

    const nonExistentComplete = await fetch(`${BASE}/reservations/99999999/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert('Validation: Complete with non-existent reservation returns 404', nonExistentComplete.status === 404);

    // Test Cancelled reservation cannot be completed
    const slotNum2 = `CP2-${Date.now().toString().slice(-4)}`;
    const createSlot2Res = await fetch(`${BASE}/slots`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_number: slotNum2, slot_type: 'compact' })
    });
    const createSlot2Data = await createSlot2Res.json();
    const testSlot2Id = createSlot2Data.slot.id;

    const book2Res = await fetch(`${BASE}/reservations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: testSlot2Id })
    });
    const book2Data = await book2Res.json();
    const res2Id = book2Data.reservation.id;

    const cancel2Res = await fetch(`${BASE}/reservations/${res2Id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert('Driver 1 cancels reservation 2', cancel2Res.status === 200);

    const completeCancelledRes = await fetch(`${BASE}/reservations/${res2Id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert('State integrity: Attempting to complete cancelled reservation returns 409 Conflict', completeCancelledRes.status === 409);

    // Test Driver 1 completes active reservation 1
    const complete1Res = await fetch(`${BASE}/reservations/${res1Id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const complete1Data = await complete1Res.json();
    assert('Driver 1 completes active reservation returns 200', complete1Res.status === 200);
    assert('Completed reservation status is "completed"', complete1Data.reservation?.status === 'completed');
    assert('Completed reservation has completed_at timestamp', !!complete1Data.reservation?.completed_at);

    // Verify slot 1 is released and is_reserved is false
    const slotsRes2 = await fetch(`${BASE}/slots`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const slotsData2 = await slotsRes2.json();
    const slot1After = slotsData2.slots.find(s => s.id === testSlot1Id);
    assert('Slot 1 is released and available again (is_reserved: false)', slot1After?.is_reserved === false);

    // Verify Driver 2 can now book the freed slot 1
    const rebookRes = await fetch(`${BASE}/reservations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driver2Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: testSlot1Id })
    });
    const rebookData = await rebookRes.json();
    assert('Released slot can be reserved again by Driver 2', rebookRes.status === 201);
    const res3Id = rebookData.reservation.id;

    // Test Double-completion rejection
    const doubleCompleteRes = await fetch(`${BASE}/reservations/${res1Id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert('State integrity: Double-completion rejected with 409 Conflict', doubleCompleteRes.status === 409);

    // Test Admin can complete active reservation 3
    const adminCompleteRes = await fetch(`${BASE}/reservations/${res3Id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminCompleteData = await adminCompleteRes.json();
    assert('Admin can complete active reservation on behalf of user', adminCompleteRes.status === 200 && adminCompleteData.reservation?.status === 'completed');

    // Verify driver's reservation history shows completed_at
    const driverMineRes = await fetch(`${BASE}/reservations/mine`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const driverMineData = await driverMineRes.json();
    const mineCompleted = driverMineData.reservations.find(r => r.id === res1Id);
    assert('Driver reservation history includes completed status and completed_at', mineCompleted?.status === 'completed' && !!mineCompleted?.completed_at);

    // Verify admin dashboard statistics track completed reservations
    const dashAfterRes = await fetch(`${BASE}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dashAfterData = await dashAfterRes.json();
    assert('Admin dashboard tracks completed reservations metric', typeof dashAfterData.reservations?.completed === 'number' && dashAfterData.reservations?.completed > 0);

    // ----------------------------------------------------
    // 10. CLEANUP TEST DATA
    // ----------------------------------------------------
    console.log('\n[10] Cleanup');
    const deleteDriver1Res = await fetch(`${BASE}/users/${driverId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('Admin cleanup: Delete driver 1 succeeds', deleteDriver1Res.status === 200);

    const deleteDriver2Res = await fetch(`${BASE}/users/${driver2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('Admin cleanup: Delete driver 2 succeeds', deleteDriver2Res.status === 200);

    // Cleanup test slots
    if (testSlot1Id || testSlot2Id) {
      await pool.query('DELETE FROM parking_slots WHERE id IN ($1, $2)', [testSlot1Id, testSlot2Id]);
    }

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
