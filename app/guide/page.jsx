"use client";
import dynamic from 'next/dynamic';
const UserGuide = dynamic(() => import('../../src/views/UserGuide'), { ssr: false });
import PrivateRoute from '../../src/components/PrivateRoute';

export default function Page() {
  return (
    <PrivateRoute>
      <UserGuide />
    </PrivateRoute>
  );
}
