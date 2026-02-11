"use client";

/**
 * TaskDetailPanel Component
 * Side panel for viewing and editing task details
 */

import {
  Calendar,
  CheckCircle,
  Edit01,
  XClose,
} from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { type Task, priorityConfig, statusConfig, getInitials } from "./task-types";

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onToggleComplete: (taskId: string) => void;
}

export function TaskDetailPanel({ task, onClose, onToggleComplete }: TaskDetailPanelProps) {
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  return (
    <div className="hidden w-96 flex-shrink-0 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:block">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Details</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <XClose className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Title</label>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
        </div>

        {task.description && (
          <div>
            <label className="text-xs font-medium text-gray-500">Description</label>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Status</label>
            <div className="mt-1">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Priority</label>
            <div className="mt-1 flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${priority.dotColor}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {priority.label}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Due Date</label>
            <div className="mt-1 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900 dark:text-white">{task.dueDate}</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Created</label>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{task.createdAt}</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Category</label>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">{task.category}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Assignee</label>
          <div className="mt-1 flex items-center gap-2">
            <Avatar initials={getInitials(task.executive)} alt={task.executive} size="sm" />
            <span className="text-sm text-gray-900 dark:text-white">{task.executive}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button size="sm" color="secondary" className="flex-1" iconLeading={Edit01}>
          Edit
        </Button>
        <Button
          size="sm"
          color={task.completed ? "secondary" : "primary"}
          className="flex-1"
          iconLeading={CheckCircle}
          onClick={() => onToggleComplete(task.id)}
        >
          {task.completed ? "Reopen" : "Complete"}
        </Button>
      </div>
    </div>
  );
}
