import { ExternalLink, Info, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n';

interface AddressMapPickerProps {
  address: string;
  mapLink: string;
  onAddressChange: (address: string) => void;
  onMapLinkChange: (link: string) => void;
  addressLabel?: string;
  required?: boolean;
}

export function AddressMapPicker({
  address,
  mapLink,
  onAddressChange,
  onMapLinkChange,
  addressLabel,
  required,
}: AddressMapPickerProps) {
  const { t } = useTranslation();
  const encodedAddress = encodeURIComponent(address.trim());
  const searchUrl = encodedAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    : '';

  const openGoogleMaps = () => {
    const savedLink = mapLink.trim();
    const target = /^https:\/\//i.test(savedLink) ? savedLink : searchUrl;
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-2">
      <Textarea
        label={addressLabel ?? t('eventAddress')}
        value={address}
        onChange={(event) => onAddressChange(event.target.value)}
        required={required}
      />
      <Input
        label={t('googleMapLink')}
        value={mapLink}
        onChange={(event) => onMapLinkChange(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="group relative">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!mapLink.trim() && !searchUrl}
              onClick={openGoogleMaps}
            >
              <ExternalLink className="h-4 w-4" /> {t('openInGoogleMaps')}
            </Button>
            <button
              type="button"
              aria-label={t('googleMapLinkHelp')}
              aria-describedby="google-map-link-help"
              className="rounded-full p-1 text-gray-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <div
            id="google-map-link-help"
            role="tooltip"
            className="invisible absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-amber-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <p className="font-semibold">{t('googleMapLinkHelp')}</p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>{t('googleMapLinkStepOpen')}</li>
              <li>{t('googleMapLinkStepShare')}</li>
              <li>{t('googleMapLinkStepPaste')}</li>
            </ol>
            <div className="mt-2 flex items-center gap-1 rounded bg-white/70 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-gray-700 dark:text-blue-200">
              <Share2 className="h-3.5 w-3.5" />
              <span>{t('googleMapShareExample')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
