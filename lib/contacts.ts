export interface Contact {
  address: string;
  name: string;
  inboxPk?: string;
  createdAt: number;
}

const CONTACTS_KEY = "pp_contacts";

export function getContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveContact(contact: Contact) {
  if (typeof window === "undefined") return;
  const contacts = getContacts();
  // Remove existing if exists (update)
  const filtered = contacts.filter(c => c.address !== contact.address);
  filtered.unshift(contact);
  window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(filtered));
}

export function removeContact(address: string) {
    if (typeof window === "undefined") return;
    const contacts = getContacts();
    const filtered = contacts.filter(c => c.address !== address);
    window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(filtered));
}
