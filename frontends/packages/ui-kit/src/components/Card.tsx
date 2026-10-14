import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

/**
 * Apple-style translucent material container featuring subtle depth,
 * backdrop blur, hairline borders, and optional interactive surface feedback.
 */
export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl bg-zinc-900/70 backdrop-blur-md border border-zinc-800/80 shadow-xl shadow-black/20 p-6
        ${interactive ? 'transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-900/90 active:scale-[0.99] cursor-pointer' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
