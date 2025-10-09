'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Star, Heart, Shield, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AppCard as AppCardType } from '@/lib/store/wallet';
import { t } from '@/lib/i18n';

interface AppDetailModalProps {
  app: AppCardType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Function to get app image based on app name
const getAppImage = (appName: string): string => {
  const appImages: { [key: string]: string } = {
    'Jupiter': 'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
    'SolPay Mini': 'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
    'RippleChat': 'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
    'MintMuse': 'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
    'Radiant Swap': 'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg',
  };
  
  return appImages[appName] || 'https://pbs.twimg.com/profile_images/1661738815890022410/F8y4vBky_400x400.jpg';
};

export const AppDetailModal = ({
  app,
  open,
  onOpenChange,
}: AppDetailModalProps) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const handleOpenApp = () => {
    console.log('app_opened', { appId: app.id, appName: app.name });
    window.open(app.website, '_blank');
  };

  const handleAddToFavorites = () => {
    console.log('app_favorited', { appId: app.id, appName: app.name });
    // In a real app, this would update the favorites list
  };

  // Don't render anything if modal is closed
  if (!open) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Content */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '28rem',
          maxHeight: '80vh',
          minHeight: 'auto',
          overflowY: 'auto',
          padding: '1.5rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '0.25rem',
            opacity: 0.7,
            transition: 'opacity 0.2s',
            color: 'var(--foreground)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem', paddingRight: '2rem' }}>
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--foreground)',
            }}
          >
            <span>{app.name}</span>
            {app.verified && (
              <Star className='h-5 w-5 text-yellow-500 fill-current' />
            )}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* App Banner */}
          <div
            style={{
              width: '100%',
              height: '6rem',
              backgroundColor: 'var(--muted)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img 
              src={getAppImage(app.name)}
              alt={app.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--muted-foreground)">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15,3 21,3 21,9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                `;
              }}
            />
          </div>

          {/* App Info */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div>
              <h3
                style={{
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: 'var(--foreground)',
                }}
              >
                {app.name}
              </h3>
              <p
                style={{
                  color: 'var(--muted-foreground)',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                }}
              >
                {app.intro}
              </p>
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--muted-foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                {typeof app.rating === 'number' && (
                  <span>★ {app.rating.toFixed(1)}</span>
                )}
                {app.installs && <span>{app.installs} installs</span>}
                {app.updatedAt && (
                  <span>
                    Updated {new Date(app.updatedAt).toLocaleDateString()}
                  </span>
                )}
                {app.version && <span>v{app.version}</span>}
              </div>
            </div>

            {/* Category and Tags */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'var(--foreground)',
                  }}
                >
                  Category:
                </span>
                <Badge variant='outline'>{app.category}</Badge>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'var(--foreground)',
                  }}
                >
                  Tags:
                </span>
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}
                >
                  {app.tags.map((tag, idx) => (
                    <Badge
                      key={`${app.id}-detail-tag-${idx}-${tag}`}
                      variant='secondary'
                      className='bg-primary text-white border-primary'
                      style={{ fontSize: '0.75rem' }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Shield
                  size={16}
                  style={{ color: 'var(--muted-foreground)' }}
                />
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'var(--foreground)',
                  }}
                >
                  {t('apps.permissions')}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  • Read wallet balance
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  • Request transactions
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  • Access public key
                </div>
              </div>
            </div>

            {/* Website Link */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--foreground)',
                }}
              >
                {t('apps.website')}
              </span>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <a
                  href={app.website}
                  target='_blank'
                  rel='noopener noreferrer'
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.textDecoration = 'underline')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.textDecoration = 'none')
                  }
                >
                  {app.website}
                </a>
                <ExternalLink
                  size={12}
                  style={{ color: 'var(--muted-foreground)' }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button
              variant='outline'
              onClick={handleAddToFavorites}
              style={{ flex: 1 }}
            >
              <Heart size={16} style={{ marginRight: '0.5rem' }} />
              {t('apps.addToFavorites')}
            </Button>
            <Button onClick={handleOpenApp} style={{ flex: 1 }}>
              <ExternalLink size={16} style={{ marginRight: '0.5rem' }} />
              {t('apps.openApp')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to document.body
  return createPortal(modalContent, document.body);
};
