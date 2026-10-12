import type { GoogleDrivePickerSessionDto } from '@agency-os/contracts';

/** MIME types allowed in the media library import picker. */
const PICKER_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
].join(',');

let pickerScriptPromise: Promise<void> | null = null;

function loadPickerScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Picker requires a browser'));
  }
  if (window.google?.picker) return Promise.resolve();
  if (pickerScriptPromise) return pickerScriptPromise;

  pickerScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-picker="true"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Picker script failed')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.dataset.googlePicker = 'true';
    script.onload = () => {
      window.gapi?.load('picker', () => resolve());
    };
    script.onerror = () => reject(new Error('Could not load Google Picker'));
    document.head.appendChild(script);
  });

  return pickerScriptPromise;
}

export async function openGoogleDrivePicker(
  session: GoogleDrivePickerSessionDto,
): Promise<string[]> {
  await loadPickerScript();
  const picker = window.google?.picker;
  if (!picker) throw new Error('Google Picker is unavailable');

  return new Promise((resolve, reject) => {
    const view = new picker.DocsView();
    view.setIncludeFolders(false);
    view.setMimeTypes(PICKER_MIME_TYPES);

    let builder = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(session.accessToken)
      .setDeveloperKey(session.apiKey)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) {
          resolve((data.docs ?? []).map((doc) => doc.id).filter(Boolean));
          return;
        }
        if (data.action === picker.Action.CANCEL) {
          resolve([]);
          return;
        }
        reject(new Error('Google Picker closed unexpectedly'));
      });

    if (session.appId) {
      builder = builder.setAppId(session.appId);
    }

    builder.build().setVisible(true);
  });
}
