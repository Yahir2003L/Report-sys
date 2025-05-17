import { logout } from '@/lib/auth';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const token = formData.get('token') as string;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Token no proporcionado' }),
      { status: 400 }
    );
  }

  try {
    await logout(token);
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Error al cerrar sesión' }),
      { status: 500 }
    );
  }
};
