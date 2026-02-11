"use client";

/**
 * Contacts Page
 * Contact directory with table view, search, filters, and sorting
 * Connected to real database via /api/contacts
 */

import { useState, useMemo, useCallback } from "react";
import type { SortDescriptor } from "react-aria-components";
import { Plus, SearchLg, Edit01, Trash01, ChevronRight } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import type { BadgeColor } from "@/components/base/badges/badges";
import type { BadgeTypes } from "@/components/base/badges/badge-types";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import {
  contacts as initialContacts,
  categoryColors,
  categoryLabels,
  getInitials,
  type Contact,
} from "./_components/contacts-data";
import { ContactSlideout } from "./_components/contact-slideout";
import { AddContactSlideout } from "./_components/add-contact-slideout";
import { useContacts, type DatabaseContact, type CreateContactData, type UpdateContactData } from "@/hooks/useContacts";
import { notify } from "@/lib/notifications";

// Convert database contact to UI contact format
const convertToUIContact = (dbContact: DatabaseContact): Contact => ({
  id: dbContact.id,
  name: dbContact.full_name,
  company: dbContact.company,
  title: dbContact.title || "",
  email: dbContact.email,
  phone: dbContact.phone || "",
  category: dbContact.category as Contact["category"],
  tags: dbContact.tags || undefined,
  notes: dbContact.relationship_notes || undefined,
  lastContact: dbContact.last_contacted_at 
    ? new Date(dbContact.last_contacted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : undefined,
});

const ITEMS_PER_PAGE = 10;

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [slideoutMode, setSlideoutMode] = useState<"view" | "edit">("view");
  const [isSlideoutOpen, setIsSlideoutOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);

  // Fetch contacts from database
  const { contacts: dbContacts, isLoading, stats, createContact, updateContact, deleteContact, refetch } = useContacts();

  // Convert database contacts to UI format
  const contacts = useMemo(() => {
    if (Array.isArray(dbContacts)) {
      return dbContacts.map(convertToUIContact);
    }
    return [];
  }, [dbContacts]);

  // Handle adding a new contact
  const handleAddContact = useCallback(async (contactData: Omit<Contact, "id">) => {
    try {
      const createData: CreateContactData = {
        full_name: contactData.name,
        email: contactData.email,
        company: contactData.company || "",
        title: contactData.title,
        phone: contactData.phone,
        category: contactData.category,
        tags: contactData.tags,
        relationship_notes: contactData.notes,
      };

      await createContact(createData);
      notify.success('Contact created', 'The contact has been added to your directory.');
    } catch (err) {
      console.error('Failed to create contact:', err);
      notify.error('Failed to create contact', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [createContact]);

  // Handle updating a contact
  const handleSaveContact = useCallback(async (contact: Contact) => {
    try {
      const updateData: UpdateContactData = {
        full_name: contact.name,
        email: contact.email,
        company: contact.company,
        title: contact.title,
        phone: contact.phone,
        category: contact.category,
        tags: contact.tags,
        relationship_notes: contact.notes,
      };

      await updateContact(contact.id, updateData);
      notify.success('Contact updated', 'The contact has been updated.');
      setIsSlideoutOpen(false);
    } catch (err) {
      console.error('Failed to update contact:', err);
      notify.error('Failed to update contact', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [updateContact]);

  // Handle deleting a contact
  const handleDeleteContact = useCallback(async (contactId: string) => {
    try {
      await deleteContact(contactId);
      notify.success('Contact deleted', 'The contact has been removed from your directory.');
    } catch (err) {
      console.error('Failed to delete contact:', err);
      notify.error('Failed to delete contact', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [deleteContact]);

  const filteredContacts = useMemo(() => {
    const safeContacts = Array.isArray(contacts) ? contacts : [];
    let filtered = [...safeContacts];

    if (activeCategory !== "all") {
      filtered = filtered.filter((c) => c.category === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.company.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [contacts, activeCategory, searchQuery]);

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof Contact];
      const second = b[sortDescriptor.column as keyof Contact];

      if (typeof first === "string" && typeof second === "string") {
        let cmp = first.localeCompare(second);
        if (sortDescriptor.direction === "descending") {
          cmp *= -1;
        }
        return cmp;
      }
      return 0;
    });
  }, [filteredContacts, sortDescriptor]);

  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedContacts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedContacts, currentPage]);

  const totalPages = Math.ceil(sortedContacts.length / ITEMS_PER_PAGE);

  const categoryCounts = useMemo(() => {
    const safeContacts = Array.isArray(contacts) ? contacts : [];
    const counts: Record<string, number> = { all: safeContacts.length };
    safeContacts.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Contacts</h1>
          <p className="text-sm text-tertiary">{contacts.length} contacts in your directory</p>
        </div>
        <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddContactOpen(true)}>
          Add Contact
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        selectedKey={activeCategory}
        onSelectionChange={(key) => {
          setActiveCategory(key as string);
          setCurrentPage(1);
        }}
      >
        <TabList
          type="button-minimal"
          items={[
            { id: "all", label: `All (${categoryCounts.all || 0})` },
            { id: "vip", label: `VIP (${categoryCounts.vip || 0})` },
            { id: "client", label: `Clients (${categoryCounts.client || 0})` },
            { id: "vendor", label: `Vendors (${categoryCounts.vendor || 0})` },
            { id: "partner", label: `Partners (${categoryCounts.partner || 0})` },
            { id: "personal", label: `Personal (${categoryCounts.personal || 0})` },
          ]}
        />
      </Tabs>

      {/* Table */}
      <TableCard.Root>
        <TableCard.Header
          title="Contact Directory"
          badge={`${sortedContacts.length} contacts`}
          contentTrailing={
            <div className="absolute top-5 right-4 md:right-6 flex items-center gap-3">
              <div className="w-64">
                <InputBase
                  size="sm"
                  type="search"
                  aria-label="Search"
                  placeholder="Search contacts..."
                  icon={SearchLg}
                  value={searchQuery}
                  onChange={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <TableRowActionsDropdown />
            </div>
          }
        />
        <Table
          aria-label="Contacts"
          selectionMode="multiple"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <Table.Header>
            <Table.Head id="name" label="Name" isRowHeader allowsSorting className="w-full max-w-1/4" />
            <Table.Head id="category" label="Category" allowsSorting />
            <Table.Head id="company" label="Company" allowsSorting />
            <Table.Head id="email" label="Email" allowsSorting className="md:hidden xl:table-cell" />
            <Table.Head id="phone" label="Phone" />
            <Table.Head id="tags" label="Tags" />
            <Table.Head id="actions" />
          </Table.Header>

          <Table.Body items={paginatedContacts}>
            {(contact) => (
              <Table.Row id={contact.id}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <Avatar initials={getInitials(contact.name)} alt={contact.name} size="md" />
                    <div className="whitespace-nowrap">
                      <p className="text-sm font-medium text-primary">{contact.name}</p>
                      <p className="text-sm text-tertiary">{contact.title}</p>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <BadgeWithDot
                    size="sm"
                    color={categoryColors[contact.category] as BadgeColor<BadgeTypes>}
                    type="pill-color"
                  >
                    {categoryLabels[contact.category]}
                  </BadgeWithDot>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">{contact.company}</Table.Cell>
                <Table.Cell className="whitespace-nowrap md:hidden xl:table-cell">{contact.email}</Table.Cell>
                <Table.Cell className="whitespace-nowrap">{contact.phone}</Table.Cell>
                <Table.Cell>
                  <div className="flex gap-1">
                    {contact.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} color="gray" size="sm">
                        {tag}
                      </Badge>
                    ))}
                    {contact.tags && contact.tags.length > 2 && (
                      <Badge color="gray" size="sm">
                        +{contact.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="px-4">
                  <div className="flex justify-end gap-0.5">
                    <ButtonUtility 
                      size="xs" 
                      color="tertiary" 
                      tooltip="Delete" 
                      icon={Trash01}
                      onClick={() => handleDeleteContact(contact.id)}
                    />
                    <ButtonUtility 
                      size="xs" 
                      color="tertiary" 
                      tooltip="Edit" 
                      icon={Edit01}
                      onClick={() => {
                        setSelectedContact(contact);
                        setSlideoutMode("edit");
                        setIsSlideoutOpen(true);
                      }}
                    />
                    <ButtonUtility 
                      size="xs" 
                      color="tertiary" 
                      tooltip="View Details" 
                      icon={ChevronRight}
                      onClick={() => {
                        setSelectedContact(contact);
                        setSlideoutMode("view");
                        setIsSlideoutOpen(true);
                      }}
                    />
                  </div>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>

        {totalPages > 1 && (
          <PaginationPageMinimalCenter
            page={currentPage}
            total={totalPages}
            onPageChange={setCurrentPage}
            className="px-4 py-3 md:px-6 md:pt-3 md:pb-4"
          />
        )}
      </TableCard.Root>

      {/* Contact Slideout */}
      <ContactSlideout
        contact={selectedContact}
        isOpen={isSlideoutOpen}
        onOpenChange={setIsSlideoutOpen}
        mode={slideoutMode}
        onSave={handleSaveContact}
      />

      {/* Add Contact Slideout */}
      <AddContactSlideout
        isOpen={isAddContactOpen}
        onOpenChange={setIsAddContactOpen}
        onSubmit={handleAddContact}
      />
    </div>
  );
}
