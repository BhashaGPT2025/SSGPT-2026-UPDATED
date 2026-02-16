
import React from 'react';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'success' | 'danger' | 'glass';
  isLoading?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
  icon, 
  label, 
  variant = 'primary', 
  isLoading = false,
  className = '',
  disabled,
  ...props 
}) => {
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white border border-transparent';
      case 'glass':
        return 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700';
      case 'primary':
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent';
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        flex items-center justify-center gap-2
        rounded-lg px-4 py-2
        font-semibold text-sm
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()}
        ${className}
      `}
      {...props}
    >
      <div className={`flex items-center justify-center ${isLoading ? 'animate-spin' : ''}`}>
        {icon}
      </div>
      <span>{isLoading ? 'Processing...' : label}</span>
    </button>
  );
};
