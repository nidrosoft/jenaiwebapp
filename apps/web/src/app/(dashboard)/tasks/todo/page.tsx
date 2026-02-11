"use client";

/**
 * To-Do Page
 * Task management with Board, List, and Table views
 * Connected to real database via /api/tasks
 */

import { useMemo, useState, useCallback } from "react";
import {
  FilterLines,
  Plus,
  SearchLg,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { 
  type Task, 
  type ViewMode, 
  categories 
} from "../_components/task-types";
import { ViewToggle } from "../_components/view-toggle";
import { KanbanBoard } from "../_components/kanban-board";
import { TaskListView } from "../_components/task-list-view";
import { TaskTableView } from "../_components/task-table-view";
import { TaskDetailPanel } from "../_components/task-detail-panel";
import { AddTaskSlideout } from "../_components/add-task-slideout";
import { Select } from "@/components/base/select/select";
import { useTasks, type DatabaseTask, type CreateTaskData } from "@/hooks/useTasks";
import { notify } from "@/lib/notifications";

// Convert database task to UI task format
const convertToUITask = (dbTask: DatabaseTask): Task => ({
  id: dbTask.id,
  title: dbTask.title,
  description: dbTask.description || undefined,
  priority: dbTask.priority,
  status: dbTask.status,
  category: dbTask.category || "Admin",
  dueDate: dbTask.due_date 
    ? new Date(dbTask.due_date.split('T')[0] + 'T12:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "",
  executive: (dbTask as any).executive?.full_name || "Unassigned",
  completed: dbTask.status === "done",
  createdAt: new Date(dbTask.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  comments: 0,
  attachments: 0,
});

export default function TodoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // Fetch tasks from database
  const { tasks: dbTasks, isLoading, stats, createTask, updateTask, refetch } = useTasks();

  // Convert database tasks to UI format
  const tasks = useMemo(() => {
    if (Array.isArray(dbTasks)) {
      return dbTasks.map(convertToUITask);
    }
    return [];
  }, [dbTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filter by completion status
      if (!showCompleted && task.completed) return false;

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(query) && !task.description?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Filter by priority
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;

      // Filter by category
      if (categoryFilter !== "All" && task.category !== categoryFilter) return false;

      return true;
    });
  }, [tasks, searchQuery, priorityFilter, categoryFilter, showCompleted]);

  // Toggle task completion - update in database
  const toggleComplete = useCallback(async (taskId: string) => {
    if (!Array.isArray(tasks)) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.completed ? "todo" : "done";
    
    try {
      await updateTask(taskId, { status: newStatus });
      
      // Update selected task if it's the one being toggled
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => prev ? { 
          ...prev, 
          completed: !prev.completed,
          status: newStatus
        } : null);
      }
    } catch (err) {
      notify.error('Failed to update task', 'Please try again.');
    }
  }, [tasks, selectedTask, updateTask]);

  // Handle adding a new task - save to database
  const handleAddTask = useCallback(async (taskData: Omit<Task, "id" | "createdAt" | "completed">) => {
    try {
      // Parse due date - handle both ISO format and display format
      let dueDate: string | undefined;
      if (taskData.dueDate) {
        // If it's already in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(taskData.dueDate)) {
          dueDate = taskData.dueDate;
        } else {
          // Try to parse the date
          const parsed = new Date(taskData.dueDate);
          if (!isNaN(parsed.getTime())) {
            dueDate = parsed.toISOString().split('T')[0];
          }
        }
      }

      const createData: CreateTaskData = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        category: taskData.category,
        due_date: dueDate,
      };

      console.log('Creating task with data:', createData);
      await createTask(createData);
      notify.success('Task created', 'Your new task has been added.');
    } catch (err) {
      console.error('Failed to create task:', err);
      notify.error('Failed to create task', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [createTask]);

  // Handle drag-and-drop status change from Kanban board
  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus as any });
      notify.success('Task moved', `Task moved to ${newStatus === 'todo' ? 'To Do' : newStatus === 'in_progress' ? 'In Progress' : newStatus === 'approval' ? 'Approval' : 'Done'}.`);
      // Update selected task if it's the one being moved
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => prev ? { ...prev, status: newStatus as any, completed: newStatus === 'done' } : null);
      }
    } catch (err) {
      notify.error('Failed to move task', 'Please try again.');
    }
  }, [updateTask, selectedTask]);

  // Priority filter items for Select component
  const priorityItems = [
    { id: "all", label: "All Priorities" },
    { id: "high", label: "High" },
    { id: "medium", label: "Medium" },
    { id: "low", label: "Low" },
  ];

  // Category filter items for Select component
  const categoryItems = categories.map((cat) => ({ id: cat, label: cat }));

  // Use stats from the hook with safeguards
  const todoCount = stats?.todo ?? 0;
  const inProgressCount = stats?.in_progress ?? 0;
  const approvalCount = stats?.approval ?? 0;
  const doneCount = stats?.done ?? 0;

  return (
    <div className="flex h-full flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white lg:text-2xl">To-Do</h1>
          <p className="text-sm text-gray-500">
            {todoCount} to do • {inProgressCount} in progress • {approvalCount} approval • {doneCount} done
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
          <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddTaskOpen(true)}>
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full lg:w-64">
            <InputBase
              size="sm"
              type="search"
              aria-label="Search"
              placeholder="Search tasks..."
              icon={SearchLg}
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
          </div>

          {/* Priority Filter */}
          <div className="w-40">
            <Select
              size="sm"
              placeholder="All Priorities"
              items={priorityItems}
              selectedKey={priorityFilter}
              onSelectionChange={(key) => setPriorityFilter(key as string)}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
          </div>

          {/* Category Filter */}
          <div className="w-36">
            <Select
              size="sm"
              placeholder="All"
              items={categoryItems}
              selectedKey={categoryFilter}
              onSelectionChange={(key) => setCategoryFilter(key as string)}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
          </div>

          <Button size="sm" color="secondary" iconLeading={FilterLines}>
            Filter & Sort
          </Button>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Show completed</span>
        </label>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {viewMode === "board" && (
            <KanbanBoard 
              tasks={filteredTasks} 
              onTaskClick={setSelectedTask}
              onStatusChange={handleStatusChange}
            />
          )}
          {viewMode === "list" && (
            <TaskListView 
              tasks={filteredTasks}
              selectedTask={selectedTask}
              onTaskClick={setSelectedTask}
              onToggleComplete={toggleComplete}
            />
          )}
          {viewMode === "table" && (
            <TaskTableView 
              tasks={filteredTasks}
              onTaskClick={setSelectedTask}
              onToggleComplete={toggleComplete}
            />
          )}
        </div>

        {/* Task Detail Panel */}
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onToggleComplete={toggleComplete}
          />
        )}
      </div>

      {/* Add Task Slideout */}
      <AddTaskSlideout
        isOpen={isAddTaskOpen}
        onOpenChange={setIsAddTaskOpen}
        onSubmit={handleAddTask}
      />
    </div>
  );
}
