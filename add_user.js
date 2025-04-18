const { pool } = require('./server/db');
const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function addUser() {
  try {
    const hashedPassword = await hashPassword('password123');
    
    const result = await pool.query(
      `INSERT INTO users 
       (username, password, first_name, last_name, name, email, role) 
       VALUES 
       ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, username, name, role`,
      ['kashif', hashedPassword, 'Kashif', 'Rizvi', 'Kashif Rizvi', 'Mail.kashifrizvi@gmail.com', 'maintenance']
    );
    
    console.log('User added successfully:', result.rows[0]);
    
  } catch (error) {
    console.error('Error adding user:', error);
  } finally {
    await pool.end();
  }
}

addUser();
