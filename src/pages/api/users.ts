import type { APIRoute } from "astro";
import { pool } from "@/lib/db";
import bcrypt from "bcrypt";
import { getUserFromToken } from "@/lib/auth";
import { checkPermission } from "@/lib/access-control";
import mysql from "mysql2/promise";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get('session_token')?.value;
    const currentUser = await getUserFromToken(token || '');
    checkPermission(currentUser, 'superadmin');

    const [users] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT id, username, full_name, role, sector, is_active, 
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created_at,
             (SELECT username FROM users WHERE id = u.created_by) as created_by_name
      FROM users u
      ORDER BY is_active DESC, role DESC, created_at DESC
    `);

    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response("Error del servidor", { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const token = cookies.get('session_token')?.value;
  const currentUser = await getUserFromToken(token || '');

  checkPermission(currentUser, 'superadmin');

  const username = formData.get('username')?.toString() || '';
  const password = formData.get('password')?.toString() || '';
  const fullName = formData.get('fullName')?.toString() || '';
  const role = formData.get('role')?.toString() as 'admin' | 'user';
  const sector = formData.get('sector')?.toString() as string;

  const [existing] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT id FROM users WHERE username = ?", [username]
  );

if (existing.length > 0) {
  return new Response(JSON.stringify({ message: "El nombre de usuario ya existe" }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.query(`
    INSERT INTO users (username, password, full_name, role, sector, created_by, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)
  `, [username, hashedPassword, fullName, role, sector, currentUser?.userId]);

  return new Response(JSON.stringify({ message: "Usuario creado" }), {
  status: 201,
  headers: { 'Content-Type': 'application/json' }
});
};
