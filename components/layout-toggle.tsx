'use client';

import { Grid, List } from 'lucide-react';
import { Button } from './ui/button';

interface LayoutToggleProps {
  layout: 'grid' | 'list';
  onLayoutChange: (layout: 'grid' | 'list') => void;
  className?: string;
}

export const LayoutToggle = ({
  layout,
  onLayoutChange,
  className,
}: LayoutToggleProps) => {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Button
        variant={layout === 'grid' ? 'default' : 'outline'}
        size='sm'
        onClick={() => onLayoutChange('grid')}
        className='h-8 w-8 p-0'
      >
        <Grid className='h-4 w-4' />
      </Button>
      <Button
        variant={layout === 'list' ? 'default' : 'outline'}
        size='sm'
        onClick={() => onLayoutChange('list')}
        className='h-8 w-8 p-0'
      >
        <List className='h-4 w-4' />
      </Button>
    </div>
  );
};
