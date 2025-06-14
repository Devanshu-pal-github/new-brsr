import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorState = ({ message = 'An error occurred' }) => (
  <div className="flex flex-col items-center justify-center p-8">
    <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
    <div className="text-center text-red-600">{message}</div>
  </div>
);

export default ErrorState;