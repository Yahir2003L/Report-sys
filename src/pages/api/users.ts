import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
import bcrypt from "bcrypt";
import { getUserFromToken } from "@/lib/auth";
import { isSuperadmin } from "@/lib/access-control";
import { checkPermission } from "@/lib/access-control";
import mysql from "mysql2/promise";

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
      const formData = await request.formData();
      const username = formData.get('username')?.toString() || '';
      const password = formData.get('password')?.toString() || '';
      const fullName = formData.get('fullName')?.toString() || '';
      const role = formData.get('role')?.toString() as 'admin' | 'user';
      const sector = formData.get('sector')?.toString() as
        | 'primaria'
        | 'secundaria'
        | 'bachillerato'
        | 'universidad';

    // validar si el usuario existe
    const [existing] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id FROM users WHERE username = ?", 
      [username]
  );

    if (existing.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'El nombre de usuario ya existe'
    }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store'}
    });
    }
  
      const token = cookies.get('session_token')?.value;
      const currentUser = await getUserFromToken(token || '');
  
      checkPermission(currentUser, 'superadmin');
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      await pool.query(
        `INSERT INTO users (username, password, full_name, role, sector, created_by, created_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)`,
        [username, hashedPassword, fullName, role, sector, currentUser?.userId || null]
      );
  
      return new Response(JSON.stringify({
        success: true,
        message: 'Usuario creado exitosamente'
    }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
    });

    } catch (err) {
      console.error('Error al crear usuario:', err);
      return new Response(JSON.stringify({
        success: false,
        message: err instanceof Error ? err.message : 'Error del servidor'
    }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
    }
  };