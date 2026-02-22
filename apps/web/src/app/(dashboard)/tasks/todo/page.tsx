"use client";

/**
 * To-Do Page
 * Task management with Board, List, and Table views
 * Connected to real database via /api/tasks
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  FilterLines,
  Plus,
  SearchLg,
  Settings01,
  Edit01,
  Trash01,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { 
  type Task, 
  type Subtask,
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
import { ConfirmDeleteDialog } from "@/components/application/confirm-delete-dialog";

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
  subtasks: Array.isArray(dbTask.subtasks) ? dbTask.subtasks.map((st: any, idx: number) => ({
    id: st.id || `subtask-${idx}`,
    title: st.title || '',
    completed: st.completed ?? false,
    completed_at: st.completed_at || null,
  })) : [],
});

export default function TodoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskDefaultStatus, setAddTaskDefaultStatus] = useState<Task["status"] | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);

  // Dynamic categories
  const [dynamicCategories, setDynamicCategories] = useState<Array<{ id: string; name: string; color: string; is_default: boolean }>>([]);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteCategoryName, setDeleteCategoryName] = useState("");

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/tasks/categories');
        if (response.ok) {
          const result = await response.json();
          const cats = result.data?.data ?? result.data ?? result;
          if (Array.isArray(cats)) {
            setDynamicCategories(cats);
          }
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Build category items from dynamic categories
  const categoryItems = useMemo(() => {
    const items = [{ id: "All", label: "All" }];
    if (dynamicCategories.length > 0) {
      dynamicCategories.forEach(cat => items.push({ id: cat.name, label: cat.name }));
    } else {
      categories.forEach(cat => {
        if (cat !== "All") items.push({ id: cat, label: cat });
      });
    }
    return items;
  }, [dynamicCategories]);

  // Add category
  const handleAddCategory = useCallback(async () => {
    if (!newCategoryName.trim()) return;
    try {
      const response = await fetch('/api/tasks/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (response.ok) {
        const result = await response.json();
        const newCat = result.data?.data ?? result.data;
        setDynamicCategories(prev => [...prev, newCat]);
        setNewCategoryName("");
        notify.success('Category added', `"${newCat.name}" has been added.`);
      }
    } catch (err) {
      notify.error('Failed to add category', 'Please try again.');
    }
  }, [newCategoryName]);

  // Rename category
  const handleRenameCategory = useCallback(async (id: string) => {
    if (!editingCategoryName.trim()) return;
    try {
      const response = await fetch('/api/tasks/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editingCategoryName.trim() }),
      });
      if (response.ok) {
        setDynamicCategories(prev => prev.map(c => c.id === id ? { ...c, name: editingCategoryName.trim() } : c));
        setEditingCategoryId(null);
        setEditingCategoryName("");
        notify.success('Category renamed', 'The category has been updated.');
      }
    } catch (err) {
      notify.error('Failed to rename category', 'Please try again.');
    }
  }, [editingCategoryName]);

  // Delete category (prompt confirmation first)
  const promptDeleteCategory = useCallback((id: string, name: string, isDefault: boolean) => {
    if (isDefault) {
      notify.error('Cannot delete default category', 'Default categories can only be renamed.');
      return;
    }
    setDeleteCategoryId(id);
    setDeleteCategoryName(name);
  }, []);

  const confirmDeleteCategory = useCallback(async () => {
    if (!deleteCategoryId) return;
    try {
      const response = await fetch('/api/tasks/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteCategoryId }),
      });
      if (response.ok) {
        setDynamicCategories(prev => prev.filter(c => c.id !== deleteCategoryId));
        notify.success('Category deleted', 'The category has been removed.');
      } else {
        const result = await response.json();
        notify.error('Error', result.error?.message || 'Cannot delete this category.');
      }
    } catch (err) {
      notify.error('Failed to delete category', 'Please try again.');
    } finally {
      setDeleteCategoryId(null);
      setDeleteCategoryName('');
    }
  }, [deleteCategoryId]);

  // Fetch tasks from database
  const { tasks: dbTasks, isLoading, stats, createTask, updateTask, deleteTask, refetch } = useTasks();

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
        subtasks: taskData.subtasks?.map(st => ({ title: st.title, completed: st.completed })) || [],
      };

      await createTask(createData);
      notify.success('Task created', 'Your new task has been added.');
    } catch (err) {
      console.error('Failed to create task:', err);
      notify.error('Failed to create task', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [createTask]);

  // Handle editing a task
  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsAddTaskOpen(true);
  }, []);

  // Handle deleting a task
  const handleDeleteTask = useCallback(async (taskId: string) => {
    setDeleteConfirmTaskId(taskId);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmTaskId) return;
    try {
      await deleteTask(deleteConfirmTaskId);
      notify.success('Task deleted', 'The task has been removed.');
      if (selectedTask?.id === deleteConfirmTaskId) {
        setSelectedTask(null);
      }
    } catch (err) {
      notify.error('Failed to delete task', 'Please try again.');
    }
    setDeleteConfirmTaskId(null);
  }, [deleteConfirmTaskId, deleteTask, selectedTask]);

  // Handle task form submit (create or edit)
  const handleTaskSubmit = useCallback(async (taskData: Omit<Task, "id" | "createdAt" | "completed">) => {
    if (editingTask) {
      // Edit mode - update existing task
      try {
        let dueDate: string | undefined;
        if (taskData.dueDate) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(taskData.dueDate)) {
            dueDate = taskData.dueDate;
          } else {
            const parsed = new Date(taskData.dueDate);
            if (!isNaN(parsed.getTime())) {
              dueDate = parsed.toISOString().split('T')[0];
            }
          }
        }

        await updateTask(editingTask.id, {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          category: taskData.category,
          due_date: dueDate,
          subtasks: taskData.subtasks?.map(st => ({ title: st.title, completed: st.completed })) || [],
        });
        notify.success('Task updated', 'Your changes have been saved.');
        setEditingTask(null);
      } catch (err) {
        notify.error('Failed to update task', err instanceof Error ? err.message : 'Please try again.');
      }
    } else {
      // Create mode
      await handleAddTask(taskData);
    }
  }, [editingTask, updateTask]);

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
              <Button size="md" color="primary" iconLeading={Plus} onClick={() => { setAddTaskDefaultStatus(undefined); setIsAddTaskOpen(true); }}>
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
              onChange={(val: string) => setSearchQuery(val)}
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
          <Button size="sm" color="secondary" iconLeading={Settings01} onClick={() => setIsCategoriesModalOpen(true)}>
            Categories
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
              onAddTask={(status) => {
                setAddTaskDefaultStatus(status);
                setEditingTask(null);
                setIsAddTaskOpen(true);
              }}
            />
          )}
          {viewMode === "list" && (
            <TaskListView 
              tasks={filteredTasks}
              selectedTask={selectedTask}
              onTaskClick={setSelectedTask}
              onToggleComplete={toggleComplete}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
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
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onSubtasksChange={async (taskId, subtasks) => {
              try {
                await updateTask(taskId, { subtasks: subtasks.map(st => ({ title: st.title, completed: st.completed })) });
                setSelectedTask(prev => prev ? { ...prev, subtasks } : null);
              } catch {
                notify.error('Failed to update subtasks', 'Please try again.');
              }
            }}
          />
        )}
      </div>

      {/* Add/Edit Task Slideout */}
      <AddTaskSlideout
        isOpen={isAddTaskOpen}
        onOpenChange={(open) => {
          setIsAddTaskOpen(open);
          if (!open) {
            setEditingTask(null);
            setAddTaskDefaultStatus(undefined);
          }
        }}
        onSubmit={handleTaskSubmit}
        editTask={editingTask}
        defaultStatus={editingTask ? undefined : addTaskDefaultStatus}
      />

      {/* Delete Task Confirmation */}
      <ConfirmDeleteDialog
        isOpen={!!deleteConfirmTaskId}
        onClose={() => setDeleteConfirmTaskId(null)}
        onConfirm={confirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />

      {/* Delete Category Confirmation */}
      <ConfirmDeleteDialog
        isOpen={!!deleteCategoryId}
        onClose={() => { setDeleteCategoryId(null); setDeleteCategoryName(''); }}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        itemName={deleteCategoryName}
      />

      {/* Manage Categories Modal */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsCategoriesModalOpen(false)}>
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Categories</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add, rename, or remove task categories. Default categories can only be renamed.</p>
            </div>

            {/* Category List */}
            <div className="mb-4 max-h-64 overflow-y-auto">
              {dynamicCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between border-b border-gray-100 py-2.5 dark:border-gray-800 last:border-b-0">
                  {editingCategoryId === cat.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(cat.id); if (e.key === 'Escape') setEditingCategoryId(null); }}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        autoFocus
                      />
                      <Button size="sm" color="primary" onClick={() => handleRenameCategory(cat.id)}>Save</Button>
                      <Button size="sm" color="secondary" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</span>
                        {cat.is_default && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          title="Rename"
                        >
                          <Edit01 className="h-4 w-4" />
                        </button>
                        {!cat.is_default && (
                          <button
                            onClick={() => promptDeleteCategory(cat.id, cat.name, cat.is_default)}
                            className="rounded p-1 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                            title="Delete"
                          >
                            <Trash01 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {dynamicCategories.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">No categories yet. Add one below.</p>
              )}
            </div>

            {/* Add New Category */}
            <div className="flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <input
                type="text"
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
              <Button size="sm" color="primary" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Add
              </Button>
            </div>

            {/* Close Button */}
            <div className="mt-4 flex justify-end">
              <Button size="sm" color="secondary" onClick={() => setIsCategoriesModalOpen(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
