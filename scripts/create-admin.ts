#!/usr/bin/env -S npx tsx

/**
 * CLI script to create an admin account.
 *
 * Prompts for username and password interactively.
 * Hashes the password with argon2id and inserts into the admins table.
 *
 * Usage: npx tsx scripts/create-admin.ts
 *        npm run create-admin
 *
 * @module scripts/create-admin
 */

import { createInterface } from 'node:readline';
import argon2 from 'argon2';
import { initDb, getDb } from '../server/db/connection.js';

const MIN_PASSWORD_LENGTH = 12;

function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      // Hide password input on TTY
      process.stdout.write(question);
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf-8');

      let input = '';
      const onData = (ch: string) => {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          stdin.setRawMode(false);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (ch === '\u0003') {
          // Ctrl+C
          process.exit(1);
        } else if (ch === '\u007F' || ch === '\b') {
          // Backspace
          input = input.slice(0, -1);
        } else {
          input += ch;
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

async function main(): Promise<void> {
  initDb();

  const username = (await prompt('Username: ')).trim();
  if (!username) {
    console.error('Error: username cannot be empty.');
    process.exit(1);
  }

  // Check if username already exists
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM admins WHERE username = ?')
    .get(username);
  if (existing) {
    console.error(`Error: admin "${username}" already exists.`);
    process.exit(1);
  }

  const password = await prompt('Password: ', true);
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `Error: password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
    process.exit(1);
  }

  const confirm = await prompt('Confirm password: ', true);
  if (password !== confirm) {
    console.error('Error: passwords do not match.');
    process.exit(1);
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });

  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(
    username,
    hash,
  );

  console.log(`Admin "${username}" created successfully.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
