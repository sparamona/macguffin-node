#!/usr/bin/env node

const { dbGet, dbAll, dbRun } = require('./db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== Macguffin Tracker - Database Client ===\n');

function showMenu() {
  console.log('\nOptions:');
  console.log('1. View all tables');
  console.log('2. View all users');
  console.log('3. View all macguffins');
  console.log('4. View all inventory');
  console.log('5. View leaderboard');
  console.log('6. Run custom SQL query');
  console.log('7. Insert test user');
  console.log('8. Insert test macguffin');
  console.log('9. Exit');
  console.log('');
}

async function viewTables() {
  const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('\nTables:');
  tables.forEach(t => console.log(`  - ${t.name}`));
}

async function viewUsers() {
  const users = await dbAll('SELECT id, email, is_admin, created_at FROM users');
  console.log('\nUsers:');
  console.table(users);
}

async function viewMacguffins() {
  const macguffins = await dbAll('SELECT * FROM macguffins');
  console.log('\nMacguffins:');
  console.table(macguffins);
}

async function viewInventory() {
  const inventory = await dbAll('SELECT * FROM user_inventory ORDER BY timestamp DESC');
  console.log('\nUser Inventory:');
  console.table(inventory);
}

async function viewLeaderboard() {
  const leaderboard = await dbAll(`
    SELECT user_email, COUNT(*) as count 
    FROM user_inventory 
    GROUP BY user_id, user_email 
    ORDER BY count DESC
  `);
  console.log('\nLeaderboard:');
  console.table(leaderboard);
}

async function runCustomQuery() {
  return new Promise((resolve) => {
    rl.question('Enter SQL query: ', async (query) => {
      try {
        if (query.trim().toUpperCase().startsWith('SELECT')) {
          const results = await dbAll(query);
          console.log('\nResults:');
          console.table(results);
        } else {
          const result = await dbRun(query);
          console.log('\nQuery executed successfully');
          console.log(`Changes: ${result.changes}, Last ID: ${result.lastID}`);
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
      resolve();
    });
  });
}

async function insertTestUser() {
  return new Promise((resolve) => {
    rl.question('Email: ', (email) => {
      rl.question('Password: ', async (password) => {
        const bcrypt = require('bcrypt');
        const { v4: uuidv4 } = require('uuid');
        
        try {
          const id = uuidv4();
          const password_hash = await bcrypt.hash(password, 10);
          await dbRun(
            'INSERT INTO users (id, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
            [id, email, password_hash, 0]
          );
          console.log(`\nUser created: ${email} (ID: ${id})`);
        } catch (error) {
          console.error('Error:', error.message);
        }
        resolve();
      });
    });
  });
}

async function insertTestMacguffin() {
  return new Promise((resolve) => {
    rl.question('Macguffin name: ', async (name) => {
      try {
        const result = await dbRun('INSERT INTO macguffins (name) VALUES (?)', [name]);
        console.log(`\nMacguffin created: ${name} (ID: ${result.lastID})`);
      } catch (error) {
        console.error('Error:', error.message);
      }
      resolve();
    });
  });
}

async function handleChoice(choice) {
  switch (choice) {
    case '1':
      await viewTables();
      break;
    case '2':
      await viewUsers();
      break;
    case '3':
      await viewMacguffins();
      break;
    case '4':
      await viewInventory();
      break;
    case '5':
      await viewLeaderboard();
      break;
    case '6':
      await runCustomQuery();
      break;
    case '7':
      await insertTestUser();
      break;
    case '8':
      await insertTestMacguffin();
      break;
    case '9':
      console.log('\nGoodbye!\n');
      rl.close();
      process.exit(0);
      break;
    default:
      console.log('\nInvalid choice');
  }
}

async function main() {
  showMenu();
  
  rl.on('line', async (input) => {
    await handleChoice(input.trim());
    showMenu();
    rl.prompt();
  });
  
  rl.prompt();
}

main();

