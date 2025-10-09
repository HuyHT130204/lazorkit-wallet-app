'use client';

import { useState } from 'react';
import { Search, Filter, Grid, List, ChevronDown } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { DrawerNav } from '@/components/drawer-nav';
import { AppCard } from '@/components/app-card';
import { AppDetailModal } from '@/components/app-detail-modal';
import { SearchBar } from '@/components/search-bar';
import { FiltersBar } from '@/components/filters-bar';
import { Pagination } from '@/components/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { useWalletStore, AppCard as AppCardType } from '@/lib/store/wallet';
import { t } from '@/lib/i18n';
import React from 'react';

export default function AppsPage() {
  const { apps } = useWalletStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppCardType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const itemsPerPage = 6;

  // initial skeleton delay 400–800ms
  React.useEffect(() => {
    const delay = 400 + Math.floor(Math.random() * 400);
    const id = setTimeout(() => setIsLoading(false), delay);
    return () => clearTimeout(id);
  }, []);

  // Filter and search apps
  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.intro.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === 'all' ||
      app.category.toLowerCase() === selectedCategory;
    const matchesVerified = !verifiedOnly || app.verified;

    return matchesSearch && matchesCategory && matchesVerified;
  });

  // Sort apps
  const sortedApps = [...filteredApps].sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical':
        return a.name.localeCompare(b.name);
      case 'newest':
        return b.id.localeCompare(a.id); // Simple demo sorting
      case 'popularity':
      default:
        return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
    }
  });

  // Paginate apps
  const totalPages = Math.ceil(sortedApps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApps = sortedApps.slice(startIndex, startIndex + itemsPerPage);

  const handleAppClick = (app: AppCardType) => {
    setSelectedApp(app);
  };

  const handleLoadMore = () => {
    setIsLoading(true);
    // Simulate loading delay
    setTimeout(() => {
      setCurrentPage((prev) => Math.min(prev + 1, totalPages));
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className='min-h-screen bg-background'>
      <div className='sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
        <AppHeader showMenu onMenuClick={() => setDrawerOpen(true)} />
      </div>

      <DrawerNav open={drawerOpen} onOpenChange={setDrawerOpen} />

      <main className='container mx-auto px-4 py-6 max-w-md'>
        <div className='space-y-6'>
          {/* Header */}
          <div className='text-center space-y-2'>
            <h1 className='text-2xl font-bold'>{t('apps.title')}</h1>
            <p className='text-muted-foreground'>{t('app.prototype')}</p>
          </div>

          {/* Search and Filters */}
          <div className='space-y-4'>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('apps.searchPlaceholder')}
            />

            <FiltersBar
              category={selectedCategory}
              onCategoryChange={setSelectedCategory}
              verifiedOnly={verifiedOnly}
              onVerifiedChange={setVerifiedOnly}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>

          {/* Apps List */}
          {isLoading ? (
            <SkeletonList count={6} />
            ) : paginatedApps.length > 0 ? (
             <div className='space-y-4'>
              {paginatedApps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  layout='list'
                  onClick={() => handleAppClick(app)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('apps.noResults')}
              description={t('common.clear') + ' ' + t('filter').toLowerCase()}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onLoadMore={handleLoadMore}
              isLoading={isLoading}
            />
          )}
        </div>
      </main>

      {/* App Detail Modal */}
      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          open={!!selectedApp}
          onOpenChange={(open) => !open && setSelectedApp(null)}
        />
      )}
    </div>
  );
}
