# CountdownTimer Component

A reusable React countdown timer component that shows days remaining until an expiry date.

## Features

- ✅ **Days-only display**: Shows remaining days in "DD" format (e.g., "05", "30")
- ✅ **YYYY-MM-DD support**: Works with native HTML date picker format
- ✅ **Real-time updates**: Updates every second automatically
- ✅ **Expired state**: Shows "منتهي الصلاحية" when expired
- ✅ **Bootstrap styling**: Uses Bootstrap classes for consistent design
- ✅ **Customizable**: Supports custom CSS classes and inline styles
- ✅ **Production ready**: Clean, optimized code with proper error handling

## Usage

```jsx
import CountdownTimer from './components/CountdownTimer';

function MyComponent() {
  return (
    <div>
      {/* Basic usage */}
      <CountdownTimer expiryDate="2025-08-20" />
      
      {/* With custom styling */}
      <CountdownTimer 
        expiryDate="2025-12-31"
        className="my-custom-class"
        style={{ minWidth: '80px' }}
      />
      
      {/* In table cells */}
      <td className="text-center">
        <CountdownTimer 
          expiryDate={document.expiryDate}
          style={{ minWidth: '60px' }}
        />
      </td>
    </div>
  );
}
```

## Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `expiryDate` | `string` | - | ✅ | Expiry date in YYYY-MM-DD format |
| `className` | `string` | `""` | ❌ | Additional CSS classes |
| `style` | `object` | `{}` | ❌ | Inline styles |

## Examples

### Document Management
```jsx
// Company documents with individual countdown timers
{documents.map((document) => (
  <tr key={document.id}>
    <td>{document.fileName}</td>
    <td>
      <CountdownTimer 
        expiryDate={document.expiryDate}
        key={`countdown-${document.id}-${document.expiryDate}`}
      />
    </td>
  </tr>
))}
```

### Different Display States

```jsx
// Active document (e.g., 5 days remaining)
<CountdownTimer expiryDate="2025-08-20" />
// Displays: "05" in red monospace text

// Expired document
<CountdownTimer expiryDate="2025-08-10" />
// Displays: "منتهي الصلاحية" in red text
```

### Custom Styling
```jsx
// With minimum width for table consistency
<CountdownTimer 
  expiryDate="2025-08-20"
  style={{ minWidth: '80px', textAlign: 'center' }}
/>

// With custom CSS class
<CountdownTimer 
  expiryDate="2025-08-20"
  className="custom-countdown-timer"
/>
```

## Styling

The component uses Bootstrap classes:
- `countdown-timer` - Base container class
- `digital-display` - Display wrapper
- `text-danger` - Red color for countdown text
- `fw-bold` - Bold font weight
- `d-flex align-items-center justify-content-center` - Centered layout

## Date Format

The component expects dates in **YYYY-MM-DD** format (ISO date format):
- ✅ `"2025-08-20"` - Correct
- ❌ `"20/08/2025"` - Incorrect
- ❌ `"08-20-2025"` - Incorrect

This format is automatically provided by HTML `<input type="date">` elements.

## Browser Compatibility

- ✅ **Modern browsers**: Full support
- ✅ **Safari**: Full support
- ✅ **Mobile browsers**: Full support
- ✅ **Internet Explorer 11**: Basic support (may need polyfills)

## Performance

- **Lightweight**: No external dependencies
- **Efficient**: Updates only when expiry date changes
- **Memory safe**: Properly cleans up intervals
- **Error handling**: Graceful fallback for invalid dates

## Integration Examples

### With React Hook Form
```jsx
import { useForm, Controller } from 'react-hook-form';
import CountdownTimer from './CountdownTimer';

function DocumentForm() {
  const { control, watch } = useForm();
  const expiryDate = watch('expiryDate');
  
  return (
    <form>
      <Controller
        name="expiryDate"
        control={control}
        render={({ field }) => (
          <input type="date" {...field} />
        )}
      />
      
      {expiryDate && (
        <CountdownTimer expiryDate={expiryDate} />
      )}
    </form>
  );
}
```

### With State Management
```jsx
function DocumentList() {
  const [documents, setDocuments] = useState([]);
  
  return (
    <table>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id}>
            <td>{doc.name}</td>
            <td>
              <CountdownTimer 
                expiryDate={doc.expiryDate}
                style={{ minWidth: '60px' }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```