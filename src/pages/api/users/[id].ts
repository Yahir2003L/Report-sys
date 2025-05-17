import type { APIRoute } from "astro";
import { pool } from "@/lib/db";
import bcrypt from "bcrypt";
import { getUserFromToken } from "@/lib/auth";
import { checkPermission, isSuperadmin } from "@/lib/access-control";
import mysql from "mysql2/promise";

interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'user' | 'admin' | 'superadmin';
  sector: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

export const GET: APIRoute = async ({ params, cookies }) => {
  const token = cookies.get('session_token')?.value;
  const currentUser = await getUserFromToken(token || '');
  checkPermission(currentUser, 'superadmin');

  const [users] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id, username, full_name, role, sector, is_active, created_by, created_at FROM users WHERE id = ?',
    [params.id]
  );

  if (users.length === 0) {
    return new Response(JSON.stringify({ message: "Usuario no encontrado" }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(users[0]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const token = cookies.get('session_token')?.value;
  const currentUser = await getUserFromToken(token || '');
  checkPermission(currentUser, 'superadmin');

  const formData = await request.formData();
  const username = formData.get('username')?.toString() || '';
  const fullName = formData.get('fullName')?.toString() || '';
  const role = formData.get('role')?.toString() || '';
  const sector = formData.get('sector')?.toString() || '';
  const password = formData.get('password')?.toString() || '';

  const userId = params.id;

  // Verificar si el usuario existe
  const [existing] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id FROM users WHERE id = ?', [userId]
  );

  if (existing.length === 0) {
    return new Response(JSON.stringify({ message: "Usuario no encontrado" }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const [usernameCheck] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]
  );

  if (usernameCheck.length > 0) {
    return new Response(JSON.stringify({ message: "El Username ya está en uso" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await pool.query(
    `UPDATE users SET username = ?, full_name = ?, role = ?, sector = ? WHERE id = ?`,
    [username, fullName, role, sector, userId]
  );

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashedPassword, userId]
    );
  }

  const [rows] = await pool.query<mysql.RowDataPacket[]>(
  `SELECT u.id, u.username, u.full_name, u.role, u.sector, u.is_active, 
          u.created_by, u.created_at,
          c.username as created_by_username
   FROM users u
   LEFT JOIN users c ON u.created_by = c.id
   WHERE u.id = ?`,
  [userId]
);

const user = rows[0] as unknown as User & { created_by_username?: string };

const createdBy = user.created_by_username || user.created_by || '-';
const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString() : '-';

const userRowHTML = `
  <tr id="user-row-${user.id}" class="border-b">
    <td class="px-4 py-2">${user.id}</td>
    <td class="px-4 py-2">${user.username}</td>
    <td class="px-4 py-2">${user.full_name}</td>
    <td class="px-4 py-2">${user.role}</td>
    <td class="px-4 py-2">${user.sector}</td>
    <td class="px-4 py-2">${user.is_active ? 'Activo' : 'Inactivo'}</td>
    <td class="px-4 py-2">${createdBy}</td>
    <td class="px-4 py-2">${createdAt}</td>
    <td class="px-4 py-2 flex gap-2">
      <button 
        hx-get="/users/edit/${user.id}" 
        hx-target="#modal-container" 
        hx-swap="innerHTML"
        class="text-blue-600 hover:underline"
      >
        Editar
      </button>

      <button
        hx-delete="/api/users/${user.id}"
        hx-target="#user-row-${user.id}"
        hx-swap="outerHTML"
        hx-confirm="¿Seguro que quieres desactivar este usuario?"
        class="text-red-600 hover:underline"
      >
        Desactivar
      </button>
    </td>
  </tr>
`;

  return new Response(userRowHTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html'
    }
  });
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const token = cookies.get('session_token')?.value;
  const currentUser = await getUserFromToken(token || '');
  if (!currentUser || !isSuperadmin(currentUser)) {
    return new Response(JSON.stringify({ message: "No autorizado" }), { status: 403 });
  }

  const userId = params.id;

  const [userCheck] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id FROM users WHERE id = ?', [userId]
  );

  if (userCheck.length === 0) {
    return new Response(JSON.stringify({ message: "Usuario no encontrado" }), { status: 404 });
  }

  if (currentUser.userId === Number(userId)) {
    return new Response(JSON.stringify({ message: "No puedes desactivar tu propio usuario" }), { status: 403 });
  }

  await pool.query(
    'UPDATE users SET is_active = 0 WHERE id = ?',
    [userId]
  );
  await pool.query(`DELETE FROM user_sessions WHERE user_id = ?`, [userId]);

  return new Response("Usuario desactivado correctamente", { status: 200 });
};

export const POST: APIRoute = async ({ params, cookies }) => {
  const token = cookies.get('session_token')?.value;
  const currentUser = await getUserFromToken(token || '');

  if (!currentUser || !isSuperadmin(currentUser)) {
    return new Response(JSON.stringify({ message: "No autorizado" }), { status: 403 });
  }

  const userId = params.id;

  const [userCheck] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id FROM users WHERE id = ?', [userId]
  );

  if (userCheck.length === 0) {
    return new Response(JSON.stringify({ message: "Usuario no encontrado" }), { status: 404 });
  }

  await pool.query(
    'UPDATE users SET is_active = 1 WHERE id = ?',
    [userId]
  );

  return new Response("Usuario activado correctamente", { status: 200 });
};
