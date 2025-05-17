import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: import.meta.env.DB_HOST,
  user: import.meta.env.DB_USER,
  password: import.meta.env.DB_PASSWORD,
  database: import.meta.env.DB_NAME,
  port: Number(import.meta.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export interface User {
  id: number;
  username: string;
  password: string;
  full_name: string;
  role: 'superadmin' | 'admin' | 'user';
  sector: 'primaria' | 'secundaria' | 'bachillerato' | 'universidad';
  created_by: number | null;
  created_at: Date; 
  is_active:boolean
}

export async function validateUser(username: string, password: string): Promise<User | null> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT * FROM users WHERE username = ?`,
    [username]
  );

  if (rows.length === 0) return null;

  const user = rows[0] as User;
  const passwordMatch = await bcrypt.compare(password, user.password);
  
  return passwordMatch ? {
    ...user,
    created_at: new Date(user.created_at),
    is_active: Boolean(user.is_active)
  } : null; 
}

export {pool}