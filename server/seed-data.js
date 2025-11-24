const { dbRun } = require('./db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function seedData() {
  console.log('Seeding test data...\n');

  try {
    // Create test users
    const users = [
      { email: 'admin@test.com', password: 'password123', is_admin: 1 },
      { email: 'user@test.com', password: 'password123', is_admin: 0 },
      { email: 'alice@test.com', password: 'password123', is_admin: 0 },
      { email: 'bob@test.com', password: 'password123', is_admin: 0 },
    ];

    console.log('Creating users...');
    for (const user of users) {
      const id = uuidv4();
      const password_hash = await bcrypt.hash(user.password, 10);
      
      await dbRun(
        'INSERT OR IGNORE INTO users (id, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
        [id, user.email, password_hash, user.is_admin]
      );
      console.log(`  ✓ ${user.email} (${user.is_admin ? 'admin' : 'user'})`);
    }

    // Get user IDs for inventory
    const { dbAll } = require('./db');
    const allUsers = await dbAll('SELECT id, email FROM users');
    
    // Create some inventory entries
    console.log('\nCreating inventory entries...');
    const inventoryData = [
      { email: 'alice@test.com', macguffin_id: 1, macguffin_name: 'Golden Idol' },
      { email: 'alice@test.com', macguffin_id: 2, macguffin_name: 'Holy Grail' },
      { email: 'alice@test.com', macguffin_id: 3, macguffin_name: 'Maltese Falcon' },
      { email: 'bob@test.com', macguffin_id: 1, macguffin_name: 'Golden Idol' },
      { email: 'bob@test.com', macguffin_id: 2, macguffin_name: 'Holy Grail' },
      { email: 'user@test.com', macguffin_id: 1, macguffin_name: 'Golden Idol' },
    ];

    for (const entry of inventoryData) {
      const user = allUsers.find(u => u.email === entry.email);
      if (user) {
        await dbRun(
          'INSERT INTO user_inventory (user_id, user_email, macguffin_id, macguffin_name) VALUES (?, ?, ?, ?)',
          [user.id, user.email, entry.macguffin_id, entry.macguffin_name]
        );
        console.log(`  ✓ ${entry.email} found ${entry.macguffin_name}`);
      }
    }

    console.log('\n✅ Test data seeded successfully!\n');
    console.log('Test accounts:');
    console.log('  admin@test.com / password123 (admin)');
    console.log('  user@test.com / password123');
    console.log('  alice@test.com / password123');
    console.log('  bob@test.com / password123\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();

