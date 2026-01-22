"use client";

import { useState, useEffect } from "react";
import { Contact, getContacts, saveContact, removeContact } from "@/lib/contacts";
import { Trash2, User, Send, Plus } from "lucide-react";
import Link from "next/link";

export function ContactBook() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newInboxPk, setNewInboxPk] = useState("");

  useEffect(() => {
    setContacts(getContacts());
  }, []);

  const handleSave = () => {
    if (!newName || !newAddress) return;
    const contact: Contact = {
        name: newName,
        address: newAddress,
        inboxPk: newInboxPk || undefined,
        createdAt: Date.now()
    };
    saveContact(contact);
    setContacts(getContacts());
    setShowAdd(false);
    setNewName("");
    setNewAddress("");
    setNewInboxPk("");
  };

  const handleDelete = (address: string) => {
    removeContact(address);
    setContacts(getContacts());
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" /> Contacts
        </h2>
        <button 
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors"
        >
            <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <input 
                placeholder="Name" 
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={newName}
                onChange={e => setNewName(e.target.value)}
            />
            <input 
                placeholder="Solana Address" 
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
            />
            <input 
                placeholder="Inbox Public Key (Optional - for E2EE)" 
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                value={newInboxPk}
                onChange={e => setNewInboxPk(e.target.value)}
            />
            <button 
                onClick={handleSave}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2 rounded-lg transition-colors"
            >
                Save Contact
            </button>
        </div>
      )}

      <div className="space-y-3">
        {contacts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
                No contacts saved yet.
            </div>
        ) : (
            contacts.map(c => (
                <div key={c.address} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div>
                        <div className="font-bold text-slate-200">{c.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 break-all">{c.address}</div>
                        {c.inboxPk && (
                             <div className="text-[10px] text-indigo-400 mt-1 flex items-center gap-1">
                                🔒 End-to-End Encryption Enabled
                             </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link 
                            href={`/pay?to=${c.address}${c.inboxPk ? `&pk=${c.inboxPk}` : ''}`}
                            className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-colors"
                            title="Pay"
                        >
                            <Send className="w-4 h-4" />
                        </Link>
                        <button 
                            onClick={() => handleDelete(c.address)}
                            className="p-2 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
