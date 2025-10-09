'use client';

import { ExternalLink, Star, Download, Users, TrendingUp } from 'lucide-react';
import { Badge } from './ui/badge';
import { AppCard as AppCardType } from '@/lib/store/wallet';

interface AppCardProps {
  app: AppCardType;
  layout: 'list';
  onClick: () => void;
}

// Function to get app image based on app name
const getAppImage = (appName: string): string => {
  const appImages: { [key: string]: string } = {
    Jupiter:
      'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
    'SolPay Mini':
      'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
    RippleChat:
      'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
    MintMuse:
      'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
    'Radiant Swap':
      'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
  };

  return (
    appImages[appName] ||
    'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg'
  );
};

// Function to format install count
const formatInstalls = (installs: string | number): string => {
  if (typeof installs === 'number') {
    if (installs >= 1000000) return `${(installs / 1000000).toFixed(1)}M`;
    if (installs >= 1000) return `${(installs / 1000).toFixed(1)}K`;
    return installs.toString();
  }
  return installs;
};

export const AppCard = ({ app, layout, onClick }: AppCardProps) => {
  return (
    <div
      className={`cursor-pointer relative overflow-hidden border-2 border-border bg-background rounded-xl shadow-sm ${
        app.verified ? 'verified-glow' : ''
      }`}
      onClick={onClick}
    >
      <div className='p-0 overflow-hidden relative'>
        <div className='flex h-32'>
          {/* App Image - 1/3 of card */}
          <div className='w-1/3 relative overflow-hidden p-2'>
            <div className='w-full h-full rounded-lg overflow-hidden relative'>
              <img
                src={getAppImage(app.name)}
                alt={app.name}
                className='w-full h-full object-cover'
                onError={(e) => {
                  // Fallback to gradient background if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `
                    <div class="w-full h-full gradient-primary flex items-center justify-center rounded-lg">
                      <span class="text-white text-lg">📱</span>
                    </div>
                  `;
                }}
              />
              {/* Verified badge overlay */}
              {app.verified && (
                <div className='absolute top-1 right-1 bg-yellow-500/90 backdrop-blur-sm rounded-full p-1 shadow-lg'>
                  <Star className='h-3 w-3 text-white fill-current' />
                </div>
              )}
            </div>
          </div>

          {/* Content - 2/3 of card */}
          <div className='w-2/3 p-3 flex flex-col justify-between'>
            {/* Header with name and category */}
            <div className='space-y-1'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-base truncate'>{app.name}</h3>
                <ExternalLink className='h-4 w-4 text-muted-foreground flex-shrink-0 ml-2' />
              </div>

              <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>
                {app.intro}
              </p>
            </div>

            {/* Bottom section with tags and stats */}
            <div className='space-y-1'>
              {/* Tags */}
              <div className='flex items-center space-x-2'>
                {app.tags.slice(0, 2).map((tag, idx) => (
                  <Badge
                    key={`${app.id}-tag-${idx}-${tag}`}
                    variant='secondary'
                    className='text-[10px] bg-primary text-white border-primary px-1.5 py-0.5'
                  >
                    {tag}
                  </Badge>
                ))}
                {app.tags.length > 2 && (
                  <span className='text-[10px] text-muted-foreground'>
                    +{app.tags.length - 2}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <div className='flex items-center space-x-3'>
                  {typeof app.rating === 'number' && (
                    <div className='flex items-center space-x-1'>
                      <Star className='h-3 w-3 text-yellow-500 fill-current' />
                      <span className='font-medium'>
                        {app.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {app.installs && (
                    <div className='flex items-center space-x-1'>
                      <Download className='h-3 w-3' />
                      <span>{formatInstalls(app.installs)}</span>
                    </div>
                  )}
                </div>

                <div className='flex items-center space-x-1 text-primary/80'>
                  <TrendingUp className='h-3 w-3' />
                  <span className='font-medium capitalize'>{app.category}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
