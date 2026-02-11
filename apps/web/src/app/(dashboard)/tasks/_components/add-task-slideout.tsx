"use client";

/**
 * AddTaskSlideout Component
 * Slideout panel for creating new tasks
 */

import { useState, useEffect } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
  Calendar,
} from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { type Task, type TaskStatus, type TaskPriority, categories } from "./task-types";

interface AddTaskSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (task: Omit<Task, "id" | "createdAt" | "completed">) => void;
}

const priorityOptions = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const statusOptions = [
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Approval", value: "approval" },
  { label: "Done", value: "done" },
];

const categoryOptions = categories
  .filter((c) => c !== "All")
  .map((c) => ({ label: c, value: c }));


export function AddTaskSlideout({ isOpen, onOpenChange, onSubmit }: AddTaskSlideoutProps) {
  const [hasReminder, setHasReminder] = useState(false);
  const [dueDate, setDueDate] = useState<DateValue | null>(null);
  const [executiveOptions, setExecutiveOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const fetchExecutives = async () => {
      try {
        const response = await fetch('/api/executives?page_size=100');
        if (response.ok) {
          const result = await response.json();
          const list = result.data?.data ?? result.data ?? [];
          setExecutiveOptions(
            Array.isArray(list) ? list.map((e: any) => ({ label: e.full_name, value: e.full_name })) : []
          );
        }
      } catch (err) {
        console.error('Failed to fetch executives:', err);
      }
    };
    if (isOpen) fetchExecutives();
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const task = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as TaskPriority,
      status: formData.get("status") as TaskStatus,
      category: formData.get("category") as string,
      dueDate: dueDate ? dueDate.toString() : "",
      executive: formData.get("executive") as string,
      comments: 0,
      attachments: 0,
    };

    onSubmit?.(task);
    onOpenChange(false);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-gray-200 px-4 py-4 dark:border-gray-800 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Task</h2>
          <p className="text-sm text-gray-500">Create a new task for your team</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="add-task-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Task Title <span className="text-error-500">*</span>
              </label>
              <Input
                id="title"
                name="title"
                size="sm"
                placeholder="e.g., Book flight, Review contract"
                isRequired
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Add details about this task..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            {/* Status & Priority */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <NativeSelect
                  id="status"
                  name="status"
                  options={statusOptions}
                  defaultValue="todo"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Priority
                </label>
                <NativeSelect
                  id="priority"
                  name="priority"
                  options={priorityOptions}
                  defaultValue="medium"
                />
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <NativeSelect
                id="category"
                name="category"
                options={categoryOptions}
                defaultValue="Admin"
              />
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Due Date <span className="text-error-500">*</span>
              </label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                aria-label="Due date"
              />
            </div>

            {/* Assignee */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="executive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Assign to Executive
              </label>
              <NativeSelect
                id="executive"
                name="executive"
                options={executiveOptions}
                defaultValue={executiveOptions[0]?.value || ""}
              />
            </div>

            {/* Reminder Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Set reminder</span>
              </div>
              <Toggle size="sm" isSelected={hasReminder} onChange={setHasReminder} />
            </div>

            {hasReminder && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reminder" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Remind me
                </label>
                <NativeSelect
                  id="reminder"
                  name="reminder"
                  options={[
                    { label: "1 day before", value: "1d" },
                    { label: "2 days before", value: "2d" },
                    { label: "1 week before", value: "1w" },
                    { label: "On due date", value: "0d" },
                  ]}
                  defaultValue="1d"
                />
              </div>
            )}
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-task-form" size="md" color="primary">
            Create Task
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
