"use client";
import dynamic from 'next/dynamic';
const Home = dynamic(() => import('../../src/views/Home'), { ssr: false });
import PrivateRoute from '../../src/components/PrivateRoute';

export default function Page() {
  return (
    <PrivateRoute>
      <Home />
    </PrivateRoute>
  );
}
