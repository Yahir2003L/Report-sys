import { sequence } from 'astro:middleware';
import { getUserFromToken } from './lib/auth';

export const onRequest = sequence( async ({ request, cookies, redirect }, next) => {
    const url = new URL(request.url);

    if (url.pathname === '/login'){
        return next();
    }
    //verificar la sesion 
    const token = cookies.get('session_token')?.value || '';
    const user = token ? await getUserFromToken(token) : null;

    if (!user && url.pathname !== '/login'){
        return redirect('/login');
    }

    return next();
});