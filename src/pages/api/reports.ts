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
        const formData = await request.formData();
        const classroom = formData.get('classroom')?.toString() || '';
        const problemType = formData.get('problemType')?.toString() as Report['problem_type'];
        const description = formData.get('description')?.toString() || '';
        const priority = formData.get('priority')?.toString() as Report['priority'];
        const assignedTo = formData.get('assignedTo')?.toString();

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

        if (!assignedTo || !/^\d+$/.test(assignedTo)) {
            return new Response(
                JSON.stringify({ message: 'Debes asignar el reporte a un técnico válido' }),
                { status: 400 }
            );
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
           (classroom, problem_type, description, sector, created_by, priority, assigned_to) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [classroom, problemType, description, sector, currentUser.userId, priority, assignedTo]
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
        const userId = userIdParam ? parseInt(userIdParam, 10) : null;
        
        
        // Validación
        if (userIdParam && !/^\d+$/.test(userIdParam)) {
            return new Response(
                JSON.stringify({ message: 'ID de usuario debe ser numérico' }),
                { status: 400 }
            );
        }

        
        let query = `
            SELECT r.id, r.classroom, r.problem_type, r.description, 
            r.status, r.priority, r.sector, r.created_at, 
            r.created_by, r.assigned_to, r.resolved_at, r.resolved_by, r.resolution_notes,
            u.full_name as created_by_name,
            u_resolved.full_name as resolved_by_name,
            u_assigned.full_name as assigned_to_name,
            u_assigned.id as assigned_to_id
            FROM reports r
            JOIN users u ON r.created_by = u.id
            LEFT JOIN users u_resolved ON r.resolved_by = u_resolved.id
            LEFT JOIN users u_assigned ON r.assigned_to = u_assigned.id
        `;

        let conditions: string[] = [];
        let params: (string|number)[] = [];

        if (currentUser.role === 'user') {
            conditions.push('r.sector = ?');
            params.push(currentUser.sector);
        } else if (currentUser.role === 'tecnico') {
            conditions.push('r.assigned_to = ?');
            params.push(currentUser.userId);
            if (sectorParam) {
                conditions.push('r.sector = ?');
                params.push(sectorParam);
            }
        } else if (currentUser.role === 'superadmin') {
            if (sectorParam) {
                conditions.push('r.sector = ?');
                params.push(sectorParam);
            }
            if (userId) {
                conditions.push('r.created_by = ?');
                params.push(userId);
            }
        }

        if (conditions.length) {
            query += ' WHERE ' + conditions.join(' AND ');
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

        if (currentUser.role !== 'tecnico' && currentUser.role !== 'superadmin') {
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
            if (!resolutionNotes || resolutionNotes.length < 50) {
                return new Response(
                    JSON.stringify({ message: 'Las notas de resolución deben tener al menos 50 caracteres' }),
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

            // asignacion de reporte a tecnico
            if (currentUser.role === 'tecnico') {
                const [assigned] = await pool.query<mysql.RowDataPacket[]>(
                    'SELECT assigned_to FROM reports WHERE id = ?',
                    [reportId]
                );

                if (!assigned.length || assigned[0].assigned_to !== currentUser.userId) {
                    return new Response(
                        JSON.stringify({ message: 'Este reporte no está asignado a ti' }),
                        { status: 403 }
                    );
                }
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

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('session_token')?.value;
    const currentUser = await getUserFromToken(token || '');
    
    if (!currentUser) {
      return new Response(
        JSON.stringify({ message: 'No autorizado' }),
        { status: 401 }
      );
    }

    const data = await request.json();
    const reportId = data.reportId;
    const newTechnicianId = data.newTechnicianId;

    // Validar datos
    if (!reportId || !newTechnicianId) {
      return new Response(
        JSON.stringify({ message: 'Datos incompletos' }),
        { status: 400 }
      );
    }

    // Obtener el reporte actual
    const [reportRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT r.*, 
              u_tech.full_name as assigned_to_name,
              u_creator.full_name as created_by_name
       FROM reports r
       LEFT JOIN users u_tech ON r.assigned_to = u_tech.id
       JOIN users u_creator ON r.created_by = u_creator.id
       WHERE r.id = ?`,
      [reportId]
    );

    if (reportRows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Reporte no encontrado' }),
        { status: 404 }
      );
    }

    const report = reportRows[0];

    // Validar que el reporte este pendiente
    if (report.status !== 'pendiente') {
      return new Response(
        JSON.stringify({ message: 'Solo se pueden reasignar reportes pendientes'}),
        { status: 400 }
      );
    }

    // Validar permisos
    if (currentUser.role === 'tecnico') {
      // Técnico solo puede reasignar reportes asignados a él
      if (report.assigned_to !== currentUser.userId) {
        return new Response(
          JSON.stringify({ message: 'No tienes permiso para reasignar este reporte' }),
          { status: 403 }
        );
      }
    }
    // Superadmin puede reasignar cualquier reporte
    // Verificar que el nuevo técnico existe y es técnico
    const [newTechRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, full_name FROM users 
       WHERE id = ? AND role = 'tecnico' AND is_active = 1`,
      [newTechnicianId]
    );

    if (newTechRows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'El técnico seleccionado no es válido' }),
        { status: 400 }
      );
    }

    // Realizar la reasignación
    await pool.query(
      `UPDATE reports 
       SET assigned_to = ?, 
           previous_technician_id = ?,
           reassigned_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [newTechnicianId, report.assigned_to, reportId]
    );

    // Registrar en el historial
    try {
      await pool.query(
        `INSERT INTO report_history 
         (report_id, action, old_value, new_value, user_id, details) 
         VALUES (?, 'reassign', ?, ?, ?, ?)`,
        [
          reportId,
          report.assigned_to,
          newTechnicianId,
          currentUser.userId,
          JSON.stringify({
            old_technician: report.assigned_to_name,
            new_technician: newTechRows[0].full_name,
            reassigned_by: currentUser.fullName || currentUser.username
          })
        ]
      );
    } catch (historyErr) {
      console.log('No se pudo registrar en historial:', historyErr);
      // Continuar aunque falle el historial
    }

    return new Response(
      JSON.stringify({ 
        message: 'Reporte reasignado exitosamente',
        newTechnician: newTechRows[0].full_name
      }),
      { status: 200 }
    );

  } catch (err) {
    console.error('Error en reasignación:', err);
    return new Response(
      JSON.stringify({ message: 'Error del servidor' }),
      { status: 500 }
    );
  }
};

