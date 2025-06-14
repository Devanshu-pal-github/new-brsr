import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingState = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center p-8">
    <Loader2 className="w-8 h-8 text-[#20305D] animate-spin mb-4" />
    <div className="text-center text-gray-600">{message}</div>
  </div>
);

export default LoadingState;