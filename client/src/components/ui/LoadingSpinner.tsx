import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'white' | 'cyan' | 'blue';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'white',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    white: 'border-white border-t-transparent',
    cyan: 'border-cyan-400 border-t-transparent',
    blue: 'border-blue-400 border-t-transparent'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div 
        className={`animate-spin rounded-full border-2 ${colorClasses[color]}`}
        style={{ animationDuration: '1s' }}
      />
    </div>
  );
};

export default LoadingSpinner;
