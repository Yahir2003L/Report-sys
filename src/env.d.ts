/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    user?: {
      userId: number;
      username: string;
      fullName: string;
      role: 'superadmin' | 'admin' | 'user';
      sector: 'primaria' | 'secundaria' | 'bachillerato' | 'universidad';
    } | null;
  }
}

declare namespace Astro {
  interface Locals extends App.Locals {}
}