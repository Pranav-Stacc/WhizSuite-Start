export interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface SearchGroup {
  type: string;
  /** Message-catalog key for the group heading. */
  label: string;
  items: SearchItem[];
}
