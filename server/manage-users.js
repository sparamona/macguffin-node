const readline = require('readline');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('./db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function listUsers() {
  console.log('\n📋 Current Users:\n');
  const users = await dbAll('SELECT email, is_admin, created_at FROM users ORDER BY created_at DESC');
  
  if (users.length === 0) {
    console.log('  No users found.\n');
    return;
  }
  
  users.forEach(user => {
    const role = user.is_admin ? '👑 ADMIN' : '👤 USER';
    const date = new Date(user.created_at).toLocaleDateString();
    console.log(`  ${role} - ${user.email} (created: ${date})`);
  });
  console.log('');
}

async function addUser() {
  console.log('\n➕ Add New User\n');
  
  const email = await question('Email: ');
  if (!email || !email.includes('@')) {
    console.log('❌ Invalid email address.\n');
    return;
  }
  
  // Check if user exists
  const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    console.log(`❌ User ${email} already exists.\n`);
    return;
  }
  
  const password = await question('Password: ');
  if (!password || password.length < 6) {
    console.log('❌ Password must be at least 6 characters.\n');
    return;
  }
  
  const isAdminInput = await question('Make admin? (y/N): ');
  const isAdmin = isAdminInput.toLowerCase() === 'y' ? 1 : 0;
  
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  
  await dbRun(
    'INSERT INTO users (id, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
    [id, email, passwordHash, isAdmin]
  );
  
  const role = isAdmin ? 'admin' : 'user';
  console.log(`✅ User ${email} created as ${role}.\n`);
}

async function deleteUser() {
  console.log('\n🗑️  Delete User\n');
  
  await listUsers();
  
  const email = await question('Email to delete: ');
  if (!email) {
    console.log('❌ No email provided.\n');
    return;
  }
  
  const user = await dbGet('SELECT id, email FROM users WHERE email = ?', [email]);
  if (!user) {
    console.log(`❌ User ${email} not found.\n`);
    return;
  }
  
  const confirm = await question(`⚠️  Delete ${email}? This will also delete their inventory. (y/N): `);
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Cancelled.\n');
    return;
  }
  
  // Delete user (inventory will be deleted by foreign key cascade if configured)
  await dbRun('DELETE FROM user_inventory WHERE user_id = ?', [user.id]);
  await dbRun('DELETE FROM users WHERE id = ?', [user.id]);
  
  console.log(`✅ User ${email} deleted.\n`);
}

async function changePassword() {
  console.log('\n🔑 Change User Password\n');
  
  await listUsers();
  
  const email = await question('Email: ');
  if (!email) {
    console.log('❌ No email provided.\n');
    return;
  }
  
  const user = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
  if (!user) {
    console.log(`❌ User ${email} not found.\n`);
    return;
  }
  
  const password = await question('New password: ');
  if (!password || password.length < 6) {
    console.log('❌ Password must be at least 6 characters.\n');
    return;
  }
  
  const passwordHash = await bcrypt.hash(password, 10);
  await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
  
  console.log(`✅ Password updated for ${email}.\n`);
}

async function toggleAdmin() {
  console.log('\n👑 Toggle Admin Status\n');
  
  await listUsers();
  
  const email = await question('Email: ');
  if (!email) {
    console.log('❌ No email provided.\n');
    return;
  }
  
  const user = await dbGet('SELECT id, is_admin FROM users WHERE email = ?', [email]);
  if (!user) {
    console.log(`❌ User ${email} not found.\n`);
    return;
  }
  
  const newStatus = user.is_admin ? 0 : 1;
  const newRole = newStatus ? 'admin' : 'regular user';
  
  await dbRun('UPDATE users SET is_admin = ? WHERE id = ?', [newStatus, user.id]);
  
  console.log(`✅ ${email} is now a ${newRole}.\n`);
}

async function showMenu() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     Macguffin User Management          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('  1. List all users');
  console.log('  2. Add new user');
  console.log('  3. Delete user');
  console.log('  4. Change user password');
  console.log('  5. Toggle admin status');
  console.log('  6. Exit');
  console.log('');

  const choice = await question('Select an option (1-6): ');

  switch (choice) {
    case '1':
      await listUsers();
      break;
    case '2':
      await addUser();
      break;
    case '3':
      await deleteUser();
      break;
    case '4':
      await changePassword();
      break;
    case '5':
      await toggleAdmin();
      break;
    case '6':
      console.log('\n👋 Goodbye!\n');
      rl.close();
      process.exit(0);
      return;
    default:
      console.log('\n❌ Invalid option.\n');
  }

  // Show menu again
  await showMenu();
}

async function main() {
  try {
    await showMenu();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();


