'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { t } from '@/lib/i18n';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  className?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  onLoadMore,
  isLoading,
  className,
}: PaginationProps) => {
  const showLoadMore = currentPage < totalPages;

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Page Numbers */}
      <div className='flex items-center space-x-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className='h-8 w-8 p-0'
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const page = i + 1;
          return (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size='sm'
              onClick={() => onPageChange(page)}
              className='h-8 w-8 p-0'
            >
              {page}
            </Button>
          );
        })}

        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className='h-8 w-8 p-0'
        >
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>

      {/* Load More Button */}
      {showLoadMore && (
        <Button
          variant='outline'
          onClick={onLoadMore}
          disabled={isLoading}
          className='w-full'
        >
          {isLoading ? t('common.loading') : t('apps.loadMore')}
        </Button>
      )}
    </div>
  );
};
