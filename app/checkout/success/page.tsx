'use client';

import { Suspense } from 'react';
import SuccessContent from './SuccessContent';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">Carregando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
