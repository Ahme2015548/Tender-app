# Activity Timeline Component

A professional, feature-rich Activity Timeline component for React applications with RTL support, built with Tailwind CSS.

## Features

- ✅ **Collapsible right-docked drawer/panel** with smooth width transitions
- ✅ **Advanced filtering** by users, activity types, and date/time ranges
- ✅ **Virtualized timeline** with infinite scroll support
- ✅ **RTL/LTR support** with Arabic localization
- ✅ **Dark mode** compatible
- ✅ **Keyboard shortcuts** (A for quick add, Ctrl/Cmd+T to toggle)
- ✅ **Responsive design** (mobile-friendly)
- ✅ **Loading states** and empty state handling
- ✅ **Accessible** with proper ARIA labels and focus management

## Installation

1. Copy the `ActivityTimeline` folder to your `src/components/` directory
2. Ensure you have Tailwind CSS configured in your project
3. Import and use the component

## Usage

```jsx
import { ActivityTimeline } from './components/ActivityTimeline';

const users = [
  {
    id: 'user1',
    name: 'أحمد محمد',
    avatarUrl: 'https://example.com/avatar1.jpg' // optional
  }
];

const activities = [
  {
    id: '1',
    type: 'task', // 'task' | 'call' | 'note' | 'email' | 'meeting'
    title: 'مراجعة المقترح',
    description: 'وصف مفصل للنشاط...', // optional
    status: 'done', // 'open' | 'done' | 'overdue'
    at: Date.now(), // ISO string or epoch milliseconds
    user: users[0],
    record: { // optional linked record
      type: 'tender', // 'tender' | 'client' | 'invoice'
      id: 'T-1023',
      label: 'مناقصة البنية التحتية'
    }
  }
];

function App() {
  const handleFilterChange = (filters) => {
    console.log('Filters changed:', filters);
    // filters = { users: string[], types: string[], from?: number, to?: number }
  };

  const handleLoadMore = () => {
    console.log('Load more requested');
    // Fetch and append more activities
  };

  return (
    <div className="relative min-h-screen">
      {/* Your main content */}
      <main>Your app content</main>
      
      {/* Activity Timeline */}
      <ActivityTimeline
        items={activities}
        users={users}
        defaultCollapsed={false}
        rtl={true}
        onFilterChange={handleFilterChange}
        onLoadMore={handleLoadMore}
        loading={false}
      />
    </div>
  );
}
```

## Component Props

### ActivityTimeline

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Activity[]` | `[]` | Array of activity objects |
| `users` | `User[]` | `[]` | Array of users for filtering |
| `defaultCollapsed` | `boolean` | `false` | Initial collapsed state |
| `rtl` | `boolean` | `true` | Enable RTL layout |
| `onFilterChange` | `function` | - | Callback when filters change |
| `onLoadMore` | `function` | - | Callback for infinite scroll |
| `loading` | `boolean` | `false` | Show loading skeleton |

### Activity Object Shape

```typescript
interface Activity {
  id: string;
  type: 'task' | 'call' | 'note' | 'email' | 'meeting';
  title: string;
  description?: string;
  status: 'open' | 'done' | 'overdue';
  at: string | number; // ISO string or epoch milliseconds
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  record?: {
    type: 'tender' | 'client' | 'invoice';
    id: string;
    label: string;
  };
}
```

### User Object Shape

```typescript
interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}
```

## Keyboard Shortcuts

- **A**: Quick add activity (stub implementation)
- **Ctrl/Cmd + T**: Toggle timeline collapse/expand

## Styling

The component uses Tailwind CSS classes and supports dark mode through the `dark:` variant classes. It's fully compatible with your existing Tailwind configuration.

### Required CSS

Make sure your project has Tailwind CSS configured. No additional CSS files are required.

## Customization

### Colors and Themes

The component automatically adapts to your Tailwind theme. Activity type colors and status indicators use semantic color tokens:

- **Tasks**: Blue (`blue-*`)
- **Calls**: Green (`green-*`)
- **Notes**: Yellow (`yellow-*`)
- **Emails**: Purple (`purple-*`)
- **Meetings**: Pink (`pink-*`)

### RTL Support

The component fully supports RTL layouts with proper text alignment, icon positioning, and animation directions. Set `rtl={true}` (default) for Arabic/RTL interfaces.

### Mobile Responsive

On smaller screens (mobile devices), the timeline adapts to provide an optimal experience while maintaining all functionality.

## Performance

- Uses React.memo for optimized re-renders
- Implements virtual scrolling patterns for large datasets
- Efficient filtering with useMemo hooks
- Lazy loading support through the `onLoadMore` callback

## Accessibility

- Full keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader compatible
- High contrast mode support

## Integration Examples

### With State Management (Redux/Zustand)

```jsx
import { useSelector, useDispatch } from 'react-redux';
import { ActivityTimeline } from './components/ActivityTimeline';

function TimelineContainer() {
  const dispatch = useDispatch();
  const { activities, users, loading } = useSelector(state => state.timeline);

  const handleFilterChange = (filters) => {
    dispatch(updateTimelineFilters(filters));
  };

  const handleLoadMore = () => {
    dispatch(loadMoreActivities());
  };

  return (
    <ActivityTimeline
      items={activities}
      users={users}
      loading={loading}
      onFilterChange={handleFilterChange}
      onLoadMore={handleLoadMore}
      rtl={true}
    />
  );
}
```

### With API Integration

```jsx
import { useState, useEffect } from 'react';
import { ActivityTimeline } from './components/ActivityTimeline';

function TimelineWithAPI() {
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [activitiesRes, usersRes] = await Promise.all([
        fetch('/api/activities'),
        fetch('/api/users')
      ]);
      
      setActivities(await activitiesRes.json());
      setUsers(await usersRes.json());
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    try {
      const response = await fetch(`/api/activities?page=${page + 1}`);
      const newActivities = await response.json();
      
      setActivities(prev => [...prev, ...newActivities]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more activities:', error);
    }
  };

  const handleFilterChange = async (filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.users?.length) params.append('users', filters.users.join(','));
      if (filters.types?.length) params.append('types', filters.types.join(','));
      if (filters.from) params.append('from', filters.from.toString());
      if (filters.to) params.append('to', filters.to.toString());

      const response = await fetch(`/api/activities?${params}`);
      const filteredActivities = await response.json();
      
      setActivities(filteredActivities);
      setPage(1);
    } catch (error) {
      console.error('Failed to filter activities:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActivityTimeline
      items={activities}
      users={users}
      loading={loading}
      onFilterChange={handleFilterChange}
      onLoadMore={handleLoadMore}
      rtl={true}
    />
  );
}
```

## License

This component is provided as-is for your project. Feel free to modify and adapt it to your needs.