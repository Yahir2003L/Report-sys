import type { APIRoute } from 'astro';
import { pool } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { checkPermission } from "@/lib/access-control";
import mysql from 'mysql2/promise';

interface Report {
  id: number;
  classroom: string;
  problem_type: 'red' | 'telefonico' | 'proyector' | 'pantalla' | 'electrico' | 'general';
  description: string;
  status: 'pendiente' | 'en_proceso' | 'resuelto';
  priority: 'alta' | 'media' | 'baja';
  sector: 'primaria' | 'secundaria' | 'bachillerato' | 'universidad';
  created_at: string;
  created_by: number;
  created_by_name: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
    const contentType = request.headers.get('content-type') || '';
    const token = cookies.get('session_token')?.value;
    const currentUser = await getUserFromToken(token || '');
  
    if (!currentUser) {
      return new Response(
        JSON.stringify({ message: 'No autorizado' }),
        { status: 401 }
      );
    }
  
    try {
      if (contentType.includes('application/json')) {
        // Validación de duplicado (solo verificar)
        const { classroom, sector, problemType } = await request.json();
  
        const [existingReports] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT id FROM reports 
           WHERE classroom = ? 
           AND sector = ? 
           AND problem_type = ? 
           AND status != 'resuelto'`,
          [classroom, sector || currentUser.sector, problemType]
        );
  
        return new Response(
          JSON.stringify({ 
            exists: existingReports.length > 0,
            duplicateId: existingReports[0]?.id 
          }),
          { status: 200 }
        );
      } else if (contentType.includes('multipart/form-data')) {
        // Crear reporte desde formulario
        const formData = await request.formData();
        const classroom = formData.get('classroom')?.toString() || '';
        const problemType = formData.get('problemType')?.toString() as Report['problem_type'];
        const description = formData.get('description')?.toString() || '';
        const priority = formData.get('priority')?.toString() as Report['priority'];
  
        let sector = currentUser.sector;
        if (currentUser.role !== 'user') {
          const selectedSector = formData.get('sector')?.toString();
          if (selectedSector) {
            sector = selectedSector as Report['sector'];
          }
        }
  
        if (!classroom || !problemType) {
          return new Response(JSON.stringify({ message: 'Campos requeridos faltantes' }), { status: 400 });
        }
  
        const [existingReports] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT id FROM reports 
           WHERE classroom = ? 
           AND sector = ? 
           AND problem_type = ? 
           AND status != 'resuelto'`,
          [classroom, sector, problemType]
        );
  
        if (existingReports.length > 0) {
          const [duplicate] = existingReports;
          return new Response(
            JSON.stringify({ 
              message: `Ya existe un reporte activo (ID: ${duplicate.id}) para este aula, sector y tipo de problema`,
              duplicateId: duplicate.id,
              exists: true
            }),
            { status: 400 }
          );
        }
  
        await pool.query(
          `INSERT INTO reports 
           (classroom, problem_type, description, sector, created_by, priority) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [classroom, problemType, description, sector, currentUser.userId, priority]
        );
  
        return new Response(
          JSON.stringify({ message: 'Reporte creado exitosamente' }),
          { status: 201 }
        );
      }
  
      return new Response(JSON.stringify({ message: 'Tipo de contenido no soportado' }), { status: 415 });
  
    } catch (err) {
      console.error('Error en POST de reporte:', err);
      return new Response(JSON.stringify({ message: 'Error del servidor' }), { status: 500 });
    }
  };
  

export const GET: APIRoute = async ({ cookies, url }) => {
    try {
        const token = cookies.get('session_token')?.value;
        const currentUser = await getUserFromToken(token || '');
        
        if (!currentUser) {
            return new Response(
                JSON.stringify({ message: 'No autorizado' }),
                { status: 401 }
            );
        }

        const sectorParam = url.searchParams.get('sector');
        const userIdParam = url.searchParams.get('user');
        
        // Validación
        if (userIdParam && !/^\d+$/.test(userIdParam)) {
            return new Response(
                JSON.stringify({ message: 'ID de usuario debe ser numérico' }),
                { status: 400 }
            );
        }

        const userId = userIdParam ? parseInt(userIdParam, 10) : null;
        let query = `
            SELECT r.id, r.classroom, r.problem_type, r.description, 
            r.status, r.priority, r.sector, r.created_at, 
            r.created_by, r.resolved_at, r.resolved_by, r.resolution_notes,
            u.full_name as created_by_name,
            u_resolved.full_name as resolved_by_name
            FROM reports r
            JOIN users u ON r.created_by = u.id
            LEFT JOIN users u_resolved ON r.resolved_by = u_resolved.id
        `;
        let params: (string | number)[] = [];

        console.log('sectorParam:', sectorParam);
        console.log('user role:', currentUser.role);
        console.log('user sector:', currentUser.sector);

        if (userId) {
            query += ` WHERE r.created_by = ?`;
            params.push(userId);
        } else if (sectorParam) {
            query += ` WHERE r.sector = ?`;
            params.push(sectorParam);
        } else if (currentUser.role === 'user') {
            query += ` WHERE r.sector = ?`;
            params.push(currentUser.sector);
        }

        query += ` ORDER BY 
                CASE 
                    WHEN r.priority = 'alta' THEN 1 
                    WHEN r.priority = 'media' THEN 2 
                    ELSE 3 
                END,
                CASE 
                    WHEN r.status = 'pendiente' THEN 1 
                    WHEN r.status = 'en_proceso' THEN 2 
                    ELSE 3 
                END, 
                r.created_at DESC`;

        const [rows] = await pool.query<mysql.RowDataPacket[]>(query, params);

        return new Response(
            JSON.stringify(rows),
            { status: 200 }
        );

    } catch (err) {
        console.error('Error al obtener reportes:', err);
        return new Response(
            JSON.stringify({ message: 'Error del servidor' }),
            { status: 500 }
        );
    }
};

// eliminar reporte
export const DELETE: APIRoute = async ({ request, cookies }) => {
    try {
        const token = cookies.get('session_token')?.value;
        const currentUser = await getUserFromToken(token || '');
        
        if (!currentUser) {
            return new Response(
                JSON.stringify({ message: 'No autorizado' }),
                { status: 401 }
            );
        }

        const { reportId } = await request.json();
        
    // verificacion si el reporte existe y pertenece al usuario
        const [report] = await pool.query<mysql.RowDataPacket[]>(
            'SELECT * FROM reports WHERE id = ?',
            [reportId]
        );

        if (report.length === 0) {
            return new Response(
                JSON.stringify({ message: 'Reporte no encontrado' }),
                { status: 404 }
            );
        }

        // Verificar permisos
        if (currentUser.role === 'user' && 
            (report[0].created_by !== currentUser.userId || report[0].sector !== currentUser.sector)) {
            return new Response(
                JSON.stringify({ message: 'No tienes permiso para eliminar este reporte' }),
                { status: 403 }
            );
        }

        // Eliminar el reporte
        await pool.query(
            'DELETE FROM reports WHERE id = ?',
            [reportId]
        );

        return new Response(
            JSON.stringify({ message: 'Reporte eliminado exitosamente' }),
            { status: 200 }
        );

    } catch (err) {
        console.error('Error al eliminar reporte:', err);
        return new Response(
            JSON.stringify({ message: 'Error del servidor' }),
            { status: 500 }
        );
    }
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
    try {
        const token = cookies.get('session_token')?.value;
        const currentUser = await getUserFromToken(token || '');
        
        if (!currentUser) {
            return new Response(
                JSON.stringify({ message: 'No autorizado' }),
                { status: 401 }
            );
        }

        if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
            return new Response(
                JSON.stringify({ message: 'No tienes permiso para esta acción' }),
                { status: 403 }
            );
        }

        const data = await request.json();
        const reportId = data.reportId;
        const newStatus = data.newStatus;
        const resolutionNotes = data.resolutionNotes;


        if (newStatus === 'resuelto') {
            if (!resolutionNotes || resolutionNotes.length < 20) {
                return new Response(
                    JSON.stringify({ message: 'Las notas de resolución deben tener al menos 20 caracteres' }),
                    { status: 400 }
                );
            }

            // Verificar que el reporte existe y no está resuelto
            const [existingReport] = await pool.query<mysql.RowDataPacket[]>(
                'SELECT id, status FROM reports WHERE id = ?',
                [reportId]
            );

            if (existingReport.length === 0) {
                return new Response(
                    JSON.stringify({ message: 'Reporte no encontrado' }),
                    { status: 404 }
                );
            }

            if (existingReport[0].status === 'resuelto') {
                return new Response(
                    JSON.stringify({ message: 'Este reporte ya está resuelto' }),
                    { status: 400 }
                );
            }

            await pool.query(
                `UPDATE reports 
                SET status = 'resuelto',
                    resolved_at = NOW(),
                    resolved_by = ?,
                    resolution_notes = ?
                WHERE id = ?`,
                [currentUser.userId, resolutionNotes, reportId]
            );

            return new Response(
                JSON.stringify({ 
                    message: 'Reporte marcado como resuelto exitosamente',
                    reportId: reportId
                }),
                { status: 200 }
            );
        }

        else if (['pendiente', 'en_proceso'].includes(newStatus)) {
            await pool.query(
                'UPDATE reports SET status = ? WHERE id = ?',
                [newStatus, reportId]
            );

            return new Response(
                JSON.stringify({ message: 'Estado del reporte actualizado' }),
                { status: 200 }
            );
        } else {
            return new Response(
                JSON.stringify({ message: 'Estado no válido' }),
                { status: 400 }
            );
        }

    } catch (err) {
        console.error('Error al actualizar reporte:', err);
        return new Response(
            JSON.stringify({ message: 'Error del servidor' }),
            { status: 500 }
        );
    }
};

