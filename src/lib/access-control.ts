export type UserRole = 'superadmin' | 'tecnico' | 'user';
export type UserSector = 'primaria' | 'secundaria' | 'bachillerato' | 'universidad';

export interface UserSession {
  userId: number;
  username: string;
  fullName: string;
  role: UserRole;
  sector: UserSector;
}

const roleHierarchy: Record<UserRole, number> = {
  superadmin: 3,
  tecnico: 2,
  user: 1
};

export function hasPermission(
  user: UserSession | null,
  requiredRole: UserRole,
  requiredSector?: UserSector
): boolean {
  // 1. Verificar autenticación
  if (!user) return false;
  
  // 2. Verificar jerarquía de roles
  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    return false;
  }

  // 3. Verificar sector (solo aplica para usuarios normales)
  if (requiredSector && user.role === 'user' && user.sector !== requiredSector) {
    return false;
  }

  return true;
}

export function checkPermission(
  user: UserSession | null,
  requiredRole: UserRole,
  requiredSector?: UserSector
): void {
  if (!hasPermission(user, requiredRole, requiredSector)) {
    throw new Error('ACCESS_DENIED');
  }
}

export function isSuperadmin(user: UserSession | null): boolean {
  return user?.role === 'superadmin';
}

export function canCreateReport(user: UserSession | null): boolean {
  return !!user;
}

export function canViewAllReports(user: UserSession | null): boolean {
  return user?.role === 'superadmin' || user?.role === 'tecnico';
}

export function canViewSectorReports(user: UserSession | null): boolean {
  return !!user;
}