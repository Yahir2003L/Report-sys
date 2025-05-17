import { login } from '@/lib/auth';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  const result = await login(username, password);

  if (!result) {
    return new Response(JSON.stringify({ message: 'Credenciales inválidas' }), { status: 401 });
  }

  console.log('Cookies before setting:', cookies);

  // Establecer la cookie con el token
  cookies.set('session_token', result.token, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  console.log('Cookies after setting:', cookies);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/reportes',
    },
  });
};
