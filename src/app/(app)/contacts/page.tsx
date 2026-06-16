import { requireUser } from "@/server/auth/session";
import { listContacts } from "@/server/queries";
import { ContactsManager } from "./ContactsManager";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const user = await requireUser();
  const contacts = await listContacts(user.id);
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Contacts</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        People to call. Add one at a time or paste a list to import in bulk.
      </p>
      <ContactsManager
        initialContacts={contacts.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          notes: c.notes,
        }))}
      />
    </main>
  );
}
