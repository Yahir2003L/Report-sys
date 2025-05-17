import { pool } from './db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mysql from 'mysql2/promise'

interface User {
  id: number;
  username: string;
  role: 'superadmin' | 'admin' | 'user';
}

export async function getUserFromToken(token: string) {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT u.id, u.username, u.full_name, u.role, u.sector
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = 1`,
    [token]
  );

  if (rows.length === 0) return null;

  const user = rows[0];
  return {
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    sector: user.sector
  };
}

export async function login(username: string, password: string) {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT id, username, password, role, full_name, sector FROM users WHERE username = ? AND is_active = 1`,
    [username]
  );

  if (rows.length === 0) return null;

  const user = rows[0];
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  // Crear sesión
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

  await pool.query(`
    INSERT INTO user_sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)`,
    [sessionToken, user.id, expiresAt]
  );

  return {
    token: sessionToken,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      sector: user.sector
    }
  };
}

export async function logout(sessionToken: string) {
  await pool.query(`
    DELETE FROM user_sessions WHERE token = ?`,
    [sessionToken]
  );
}
