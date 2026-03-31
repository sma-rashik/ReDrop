"use client";
import dynamic from 'next/dynamic';
const AdminPanel = dynamic(() => import('../../src/views/AdminPanel'), { ssr: false });

export default function Page() {
  return <AdminPanel />;
}
