import type { APIRoute } from 'astro';
import { pool } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import mysql from 'mysql2/promise';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get('session_token')?.value;
    const currentUser = await getUserFromToken(token || '');

    if (!currentUser) {
      return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 401 });
    }

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, full_name 
       FROM users 
       WHERE role = 'tecnico'
       ORDER BY full_name ASC`
    );

    return new Response(JSON.stringify(rows), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Error del servidor' }), { status: 500 });
  }
};
