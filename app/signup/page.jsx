"use client";
import dynamic from 'next/dynamic';
const Signup = dynamic(() => import('../../src/views/Signup'), { ssr: false });

export default function Page() {
  return <Signup />;
}
