'use client';

import { Filter, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { SimpleSelect } from './ui/simple-select';
import { t } from '@/lib/i18n';

interface FiltersBarProps {
  category: string;
  onCategoryChange: (category: string) => void;
  verifiedOnly: boolean;
  onVerifiedChange: (verified: boolean) => void;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  className?: string;
}

export const FiltersBar = ({
  category,
  onCategoryChange,
  verifiedOnly,
  onVerifiedChange,
  sortBy,
  onSortChange,
  className,
}: FiltersBarProps) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Category Filter */}
      <SimpleSelect
        value={category}
        onValueChange={onCategoryChange}
        options={[
          { value: 'all', label: t('apps.categories.all') },
          { value: 'defi', label: t('apps.categories.defi') },
          { value: 'social', label: t('apps.categories.social') },
          { value: 'games', label: t('apps.categories.games') },
          { value: 'tools', label: t('apps.categories.tools') },
        ]}
        className='w-32'
      />

      {/* Verified Filter */}
      <Button
        variant={verifiedOnly ? 'default' : 'outline'}
        size='sm'
        onClick={() => onVerifiedChange(!verifiedOnly)}
        className='flex items-center space-x-1'
      >
        <Filter className='h-4 w-4' />
        <span>Verified</span>
      </Button>

      {/* Sort Filter */}
      <SimpleSelect
        value={sortBy}
        onValueChange={onSortChange}
        options={[
          { value: 'popularity', label: t('apps.sortOptions.popularity') },
          { value: 'newest', label: t('apps.sortOptions.newest') },
          { value: 'alphabetical', label: t('apps.sortOptions.alphabetical') },
        ]}
        className='w-32'
      />
    </div>
  );
};
