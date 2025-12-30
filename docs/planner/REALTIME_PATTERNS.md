# REAL-TIME PATTERNS & EXAMPLES

**Common Patterns for Collaborative Applications**

This guide shows **real-world examples** of how to use the real-time architecture for common features.

---

## 📋 Table of Contents

1. [Task Management](#task-management)
2. [Note-Taking / Rich Text Editing](#note-taking)
3. [Kanban Boards](#kanban-boards)
4. [Comments & Threads](#comments--threads)
5. [File Uploads](#file-uploads)
6. [Presence Indicators](#presence-indicators)
7. [Collaborative Lists](#collaborative-lists)
8. [Permissions & Sharing](#permissions--sharing)

---

## 🎯 Task Management

### Create a Task

```typescript
import { useWrite } from '../hooks'

export function CreateTaskButton({ boardId }: { boardId: string }) {
  const write = useWrite()

  const handleCreate = async () => {
    const taskId = crypto.randomUUID()

    await write([
      { type: 'set', table: 'tasks', id: taskId, key: 'id', value: taskId },
      { type: 'set', table: 'tasks', id: taskId, key: 'version', value: 1 },
      { type: 'set', table: 'tasks', id: taskId, key: 'boardId', value: boardId },
      { type: 'set', table: 'tasks', id: taskId, key: 'title', value: 'New Task' },
      { type: 'set', table: 'tasks', id: taskId, key: 'status', value: 'todo' },
      { type: 'set', table: 'tasks', id: taskId, key: 'createdBy', value: userId },
      { type: 'set-now', table: 'tasks', id: taskId, key: 'createdAt' },
    ])
  }

  return <button onClick={handleCreate}>+ New Task</button>
}
```

### Update Task Status

```typescript
export function TaskStatusSelect({ taskId }: { taskId: string }) {
  const task = useRecord<Task>('tasks', taskId)
  const write = useWrite()

  const handleChange = async (newStatus: Task['status']) => {
    await write([
      { type: 'set', table: 'tasks', id: taskId, key: 'status', value: newStatus },
      { type: 'set-now', table: 'tasks', id: taskId, key: 'updatedAt' },
    ])
  }

  return (
    <select value={task?.status} onChange={(e) => handleChange(e.target.value)}>
      <option value="todo">To Do</option>
      <option value="in_progress">In Progress</option>
      <option value="done">Done</option>
    </select>
  )
}
```

### Assign Task to User

```typescript
export function TaskAssignee({ taskId }: { taskId: string }) {
  const task = useRecord<Task>('tasks', taskId)
  const write = useWrite()

  const handleAssign = async (userId: string) => {
    await write([
      { type: 'set', table: 'tasks', id: taskId, key: 'assigneeId', value: userId },
      { type: 'set-now', table: 'tasks', id: taskId, key: 'updatedAt' },
    ])
  }

  return (
    <UserPicker
      value={task?.assigneeId}
      onChange={handleAssign}
    />
  )
}
```

### Delete Task (Soft Delete)

```typescript
export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const write = useWrite()

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return

    await write([
      { type: 'set-now', table: 'tasks', id: taskId, key: 'deleted' },
    ])
  }

  return <button onClick={handleDelete}>🗑 Delete</button>
}
```

### Filter Out Deleted Tasks

```typescript
export function TaskList({ boardId }: { boardId: string }) {
  const allTasks = useRecords<Task>('tasks', { boardId })

  // Filter out deleted tasks
  const activeTasks = allTasks.filter(task => !task.deleted)

  return (
    <div>
      {activeTasks.map(task => (
        <TaskCard key={task.id} taskId={task.id} />
      ))}
    </div>
  )
}
```

---

## 📝 Note-Taking

### Edit Note Title

```typescript
export function NoteTitleInput({ noteId }: { noteId: string }) {
  const note = useRecord<Note>('notes', noteId)
  const write = useWrite()

  const handleChange = async (newTitle: string) => {
    await write([
      { type: 'set', table: 'notes', id: noteId, key: 'title', value: newTitle },
      { type: 'set-now', table: 'notes', id: noteId, key: 'updatedAt' },
    ])
  }

  return (
    <input
      type="text"
      value={note?.title || ''}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Untitled Note"
    />
  )
}
```

### Edit Note Content (Debounced)

```typescript
import { useState, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'

export function NoteContentEditor({ noteId }: { noteId: string }) {
  const note = useRecord<Note>('notes', noteId)
  const write = useWrite()
  const [content, setContent] = useState(note?.content || '')

  // Sync with remote changes
  useEffect(() => {
    if (note?.content !== content) {
      setContent(note?.content || '')
    }
  }, [note?.content])

  // Debounce writes (don't send every keystroke)
  const debouncedWrite = useDebouncedCallback((newContent: string) => {
    write([
      { type: 'set', table: 'notes', id: noteId, key: 'content', value: newContent },
      { type: 'set-now', table: 'notes', id: noteId, key: 'updatedAt' },
    ])
  }, 500)

  const handleChange = (newContent: string) => {
    setContent(newContent)
    debouncedWrite(newContent)
  }

  return (
    <textarea
      value={content}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Start writing..."
    />
  )
}
```

### Add/Remove Tags

```typescript
export function NoteTags({ noteId }: { noteId: string }) {
  const note = useRecord<Note>('notes', noteId)
  const write = useWrite()

  const handleAddTag = async (tag: string) => {
    await write([
      { type: 'listInsert', table: 'notes', id: noteId, key: 'tags', value: tag, position: 'append' },
      { type: 'set-now', table: 'notes', id: noteId, key: 'updatedAt' },
    ])
  }

  const handleRemoveTag = async (tag: string) => {
    await write([
      { type: 'listRemove', table: 'notes', id: noteId, key: 'tags', value: tag },
      { type: 'set-now', table: 'notes', id: noteId, key: 'updatedAt' },
    ])
  }

  return (
    <div className="tags">
      {note?.tags.map(tag => (
        <span key={tag} className="tag">
          {tag}
          <button onClick={() => handleRemoveTag(tag)}>×</button>
        </span>
      ))}

      <TagInput onAdd={handleAddTag} />
    </div>
  )
}
```

---

## 📊 Kanban Boards

### Drag and Drop Tasks Between Columns

```typescript
import { DndContext, DragEndEvent } from '@dnd-kit/core'

export function KanbanBoard({ boardId }: { boardId: string }) {
  const tasks = useRecords<Task>('tasks', { boardId })
  const write = useWrite()

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as Task['status']

    await write([
      { type: 'set', table: 'tasks', id: taskId, key: 'status', value: newStatus },
      { type: 'set-now', table: 'tasks', id: taskId, key: 'updatedAt' },
    ])
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        <Column status="todo" tasks={tasks.filter(t => t.status === 'todo')} />
        <Column status="in_progress" tasks={tasks.filter(t => t.status === 'in_progress')} />
        <Column status="done" tasks={tasks.filter(t => t.status === 'done')} />
      </div>
    </DndContext>
  )
}
```

### Reorder Tasks Within Column

```typescript
export function Column({ status, tasks }: { status: string, tasks: Task[] }) {
  const write = useWrite()

  const handleReorder = async (taskId: string, newIndex: number) => {
    await write([
      { type: 'set', table: 'tasks', id: taskId, key: 'orderIndex', value: newIndex },
      { type: 'set-now', table: 'tasks', id: taskId, key: 'updatedAt' },
    ])
  }

  return (
    <div className="column">
      <h3>{status}</h3>

      {tasks
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onReorder={(newIndex) => handleReorder(task.id, newIndex)}
          />
        ))}
    </div>
  )
}
```

---

## 💬 Comments & Threads

### Add Comment

```typescript
export function AddComment({ taskId }: { taskId: string }) {
  const write = useWrite()
  const [text, setText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const commentId = crypto.randomUUID()

    await write([
      { type: 'set', table: 'comments', id: commentId, key: 'id', value: commentId },
      { type: 'set', table: 'comments', id: commentId, key: 'version', value: 1 },
      { type: 'set', table: 'comments', id: commentId, key: 'taskId', value: taskId },
      { type: 'set', table: 'comments', id: commentId, key: 'text', value: text },
      { type: 'set', table: 'comments', id: commentId, key: 'authorId', value: currentUserId },
      { type: 'set-now', table: 'comments', id: commentId, key: 'createdAt' },
    ])

    setText('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
      />
      <button type="submit">Post</button>
    </form>
  )
}
```

### Display Comments

```typescript
export function CommentList({ taskId }: { taskId: string }) {
  const comments = useRecords<Comment>('comments', { taskId })

  const sortedComments = comments
    .filter(c => !c.deleted)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="comment-list">
      {sortedComments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  )
}
```

### Edit/Delete Comment

```typescript
export function CommentItem({ comment }: { comment: Comment }) {
  const write = useWrite()
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(comment.text)

  const handleSave = async () => {
    await write([
      { type: 'set', table: 'comments', id: comment.id, key: 'text', value: text },
      { type: 'set-now', table: 'comments', id: comment.id, key: 'updatedAt' },
    ])
    setIsEditing(false)
  }

  const handleDelete = async () => {
    await write([
      { type: 'set-now', table: 'comments', id: comment.id, key: 'deleted' },
    ])
  }

  return (
    <div className="comment">
      {isEditing ? (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </>
      ) : (
        <>
          <p>{comment.text}</p>
          <button onClick={() => setIsEditing(true)}>Edit</button>
          <button onClick={handleDelete}>Delete</button>
        </>
      )}
    </div>
  )
}
```

---

## 📎 File Uploads

### Upload File with Progress

```typescript
import { createStorage } from '@aahn/storage'

export function FileUpload({ taskId }: { taskId: string }) {
  const write = useWrite()
  const storage = createStorage()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleUpload = async (file: File) => {
    setUploading(true)

    try {
      // 1. Upload to S3
      const key = `tasks/${taskId}/${file.name}`
      await storage.upload(key, file, {
        onProgress: (p) => setProgress(p)
      })

      // 2. Create file record
      const fileId = crypto.randomUUID()

      await write([
        { type: 'set', table: 'files', id: fileId, key: 'id', value: fileId },
        { type: 'set', table: 'files', id: fileId, key: 'version', value: 1 },
        { type: 'set', table: 'files', id: fileId, key: 'taskId', value: taskId },
        { type: 'set', table: 'files', id: fileId, key: 'filename', value: file.name },
        { type: 'set', table: 'files', id: fileId, key: 'storageKey', value: key },
        { type: 'set', table: 'files', id: fileId, key: 'sizeBytes', value: file.size },
        { type: 'set-now', table: 'files', id: fileId, key: 'createdAt' },
      ])

    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={uploading}
      />

      {uploading && (
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
```

---

## 👥 Presence Indicators

### Show Who's Viewing

```typescript
// Schema addition
export const presence = pgTable('presence', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  userId: uuid('user_id').notNull().references(() => users.id),
  resourceType: text('resource_type').notNull(), // 'task', 'note', etc.
  resourceId: uuid('resource_id').notNull(),

  lastSeenAt: timestamp('last_seen_at').notNull(),
})

// Component
export function PresenceIndicator({ resourceType, resourceId }: { resourceType: string, resourceId: string }) {
  const write = useWrite()
  const presence = useRecords<Presence>('presence', { resourceType, resourceId })

  // Heartbeat every 5 seconds
  useEffect(() => {
    const presenceId = crypto.randomUUID()

    const interval = setInterval(() => {
      write([
        { type: 'set', table: 'presence', id: presenceId, key: 'userId', value: currentUserId },
        { type: 'set', table: 'presence', id: presenceId, key: 'resourceType', value: resourceType },
        { type: 'set', table: 'presence', id: presenceId, key: 'resourceId', value: resourceId },
        { type: 'set-now', table: 'presence', id: presenceId, key: 'lastSeenAt' },
      ])
    }, 5000)

    return () => clearInterval(interval)
  }, [resourceType, resourceId])

  // Filter recent viewers (within last 30 seconds)
  const activeUsers = presence.filter(p => {
    const lastSeen = new Date(p.lastSeenAt).getTime()
    return Date.now() - lastSeen < 30000 && p.userId !== currentUserId
  })

  return (
    <div className="presence">
      {activeUsers.map(p => (
        <UserAvatar key={p.userId} userId={p.userId} />
      ))}
    </div>
  )
}
```

---

## 📃 Collaborative Lists

### Shared Shopping List

```typescript
export const shoppingLists = pgTable('shopping_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  name: text('name').notNull(),
  items: jsonb('items').$type<ShoppingItem[]>().notNull().default([]),
  sharedWith: jsonb('shared_with').$type<string[]>().notNull().default([]),

  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

type ShoppingItem = {
  id: string
  text: string
  checked: boolean
}

export function ShoppingList({ listId }: { listId: string }) {
  const list = useRecord<ShoppingList>('shopping_lists', listId)
  const write = useWrite()

  const handleAddItem = async (text: string) => {
    const item: ShoppingItem = {
      id: crypto.randomUUID(),
      text,
      checked: false
    }

    await write([
      { type: 'listInsert', table: 'shopping_lists', id: listId, key: 'items', value: item, position: 'append' },
      { type: 'set-now', table: 'shopping_lists', id: listId, key: 'updatedAt' },
    ])
  }

  const handleToggleItem = async (item: ShoppingItem) => {
    const updatedItem = { ...item, checked: !item.checked }

    await write([
      { type: 'listRemove', table: 'shopping_lists', id: listId, key: 'items', value: item },
      { type: 'listInsert', table: 'shopping_lists', id: listId, key: 'items', value: updatedItem, position: 'append' },
      { type: 'set-now', table: 'shopping_lists', id: listId, key: 'updatedAt' },
    ])
  }

  return (
    <div className="shopping-list">
      <h2>{list?.name}</h2>

      <ul>
        {list?.items.map(item => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => handleToggleItem(item)}
              />
              <span style={{ textDecoration: item.checked ? 'line-through' : 'none' }}>
                {item.text}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <AddItemForm onAdd={handleAddItem} />
    </div>
  )
}
```

---

## 🔒 Permissions & Sharing

### Share Workspace with User

```typescript
export function ShareWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const write = useWrite()
  const [email, setEmail] = useState('')

  const handleShare = async () => {
    // Look up user by email (via API)
    const response = await fetch(`/api/users/search?email=${email}`)
    const { userId } = await response.json()

    // Add to workspace members
    await write([
      { type: 'listInsert', table: 'workspaces', id: workspaceId, key: 'memberIds', value: userId, position: 'append' },
      { type: 'set-now', table: 'workspaces', id: workspaceId, key: 'updatedAt' },
    ])

    setEmail('')
  }

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@example.com"
      />
      <button onClick={handleShare}>Share</button>
    </div>
  )
}
```

### Remove User from Workspace

```typescript
export function RemoveMemberButton({ workspaceId, userId }: { workspaceId: string, userId: string }) {
  const write = useWrite()

  const handleRemove = async () => {
    await write([
      { type: 'listRemove', table: 'workspaces', id: workspaceId, key: 'memberIds', value: userId },
      { type: 'set-now', table: 'workspaces', id: workspaceId, key: 'updatedAt' },
    ])
  }

  return <button onClick={handleRemove}>Remove</button>
}
```

### Check Access

```typescript
export function ProtectedWorkspace({ workspaceId }: { workspaceId: string }) {
  const workspace = useRecord<Workspace>('workspaces', workspaceId)
  const { userId } = useRealtime()

  const hasAccess = workspace && (
    workspace.ownerId === userId ||
    workspace.memberIds.includes(userId)
  )

  if (!hasAccess) {
    return <div>You don't have access to this workspace</div>
  }

  return <WorkspaceContent workspaceId={workspaceId} />
}
```

---

## 🎨 Advanced Patterns

### Optimistic UI with Rollback

```typescript
export function OptimisticTaskToggle({ taskId }: { taskId: string }) {
  const task = useRecord<Task>('tasks', taskId)
  const { recordCache, transactionQueue } = useRealtime()
  const [optimisticStatus, setOptimisticStatus] = useState<Task['status']>()

  const handleToggle = async () => {
    const newStatus = task?.status === 'done' ? 'todo' : 'done'

    // Set optimistic state
    setOptimisticStatus(newStatus)

    try {
      await write([
        { type: 'set', table: 'tasks', id: taskId, key: 'status', value: newStatus }
      ])

      // Clear optimistic state on success
      setOptimisticStatus(undefined)

    } catch (error) {
      // Rollback on error
      setOptimisticStatus(undefined)
      alert('Failed to update task')
    }
  }

  const displayStatus = optimisticStatus || task?.status

  return (
    <button onClick={handleToggle}>
      {displayStatus === 'done' ? '✓' : '○'}
    </button>
  )
}
```

### Batch Operations

```typescript
export function BulkArchiveTasks({ taskIds }: { taskIds: string[] }) {
  const write = useWrite()

  const handleArchive = async () => {
    // Create all operations at once
    const operations = taskIds.flatMap(taskId => [
      { type: 'set', table: 'tasks', id: taskId, key: 'archived', value: true },
      { type: 'set-now', table: 'tasks', id: taskId, key: 'updatedAt' },
    ])

    // Send as single transaction
    await write(operations)
  }

  return <button onClick={handleArchive}>Archive {taskIds.length} tasks</button>
}
```

---

These patterns cover 90% of real-time collaboration features! Mix and match for your specific app. 🚀
