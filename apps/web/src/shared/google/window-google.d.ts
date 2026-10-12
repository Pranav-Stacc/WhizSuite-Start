export type GooglePickerDocsView = {
  setIncludeFolders: (include: boolean) => GooglePickerDocsView;
  setMimeTypes: (mimeTypes: string) => GooglePickerDocsView;
};

export type GooglePickerApi = {
  PickerBuilder: new () => {
    addView: (view: GooglePickerDocsView) => GooglePickerBuilder;
    setOAuthToken: (token: string) => GooglePickerBuilder;
    setDeveloperKey: (key: string) => GooglePickerBuilder;
    setAppId: (appId: string) => GooglePickerBuilder;
    enableFeature: (feature: unknown) => GooglePickerBuilder;
    setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
    build: () => { setVisible: (visible: boolean) => void };
  };
  DocsView: new () => GooglePickerDocsView;
  Action: { PICKED: string; CANCEL: string };
  Feature: { MULTISELECT_ENABLED: unknown };
};

type GooglePickerBuilder = {
  addView: (view: GooglePickerDocsView) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  enableFeature: (feature: unknown) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

export type GooglePickerResponse = {
  action: string;
  docs?: Array<{ id: string; name: string; mimeType: string }>;
};

declare global {
  interface Window {
    gapi?: { load: (name: string, callback: () => void) => void };
    google?: {
      accounts?: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              width?: number;
              logo_alignment?: string;
            },
          ) => void;
          prompt: () => void;
        };
      };
      picker?: GooglePickerApi;
    };
  }
}

export {};
