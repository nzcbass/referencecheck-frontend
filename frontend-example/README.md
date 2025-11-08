# Reference Check Frontend

React/TypeScript frontend components for the Reference Check system.

## 📦 Components

### Main Components

1. **`ReferenceRequestApp`** - Main application container with workflow management
2. **`CreateReferenceRequest`** - Form to create a new reference check request
3. **`AddReferees`** - Form to add multiple referees to a request
4. **`RequestList`** - Display and filter all reference requests

### Features

- ✅ Create reference requests with candidate information
- ✅ Add multiple referees with contact details
- ✅ View and filter all requests
- ✅ Form validation with error handling
- ✅ Responsive design
- ✅ TypeScript support
- ✅ Modern, clean UI

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Configuration

1. Set your API URL in `.env`:

```bash
REACT_APP_API_URL=http://localhost:5001/api
```

2. Update `App.tsx` with your user and template IDs:

```typescript
const USER_ID = 'your-user-id-here';
const TEMPLATE_ID = 'your-template-id-here';
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173`

### Production Build

```bash
npm run build
```

## 🎨 Styling

The components use a custom CSS file (`styles.css`) with a modern, professional design:

- Clean, minimal interface
- Responsive for mobile and desktop
- Accessible form controls
- Consistent color scheme
- Status badges for request states

## 📝 Usage Example

### Basic Integration

```tsx
import { ReferenceRequestApp } from './ReferenceRequestApp';
import './styles.css';

function App() {
  return (
    <ReferenceRequestApp
      userId="user-123"
      templateId="template-456"
      apiUrl="http://localhost:5001/api"
    />
  );
}
```

### Individual Components

You can also use components separately:

```tsx
import { CreateReferenceRequest } from './CreateReferenceRequest';

function MyPage() {
  const handleSuccess = (requestId: string) => {
    console.log('Request created:', requestId);
  };

  return (
    <CreateReferenceRequest
      userId="user-123"
      templateId="template-456"
      onSuccess={handleSuccess}
      apiUrl="http://localhost:5001/api"
    />
  );
}
```

## 🔌 API Integration

All components communicate with the backend API:

- `POST /api/requests` - Create new request
- `GET /api/requests` - List all requests
- `GET /api/requests/{id}` - Get request details
- `POST /api/requests/{id}/referees` - Add referees

## 🎯 Workflow

1. **Create Request**: User fills in candidate details and position
2. **Add Referees**: User adds one or more referee contacts
3. **View Requests**: See all requests with status and details
4. **Send Invitations**: Backend generates tokens and sends emails

## 📱 Responsive Design

- Desktop: Multi-column layout with side-by-side fields
- Tablet: Adjusted spacing and font sizes
- Mobile: Single-column layout, touch-friendly buttons

## 🛠️ Customization

### Styling

Modify `styles.css` to match your brand:

```css
.btn-primary {
  background: #your-brand-color;
}
```

### Validation

Add custom validation in component files:

```typescript
const validateForm = (): boolean => {
  // Add your custom validation logic
  return true;
};
```

### Fields

Add or modify form fields by updating the interface and form:

```typescript
interface FormData {
  // Add new fields here
  custom_field: string;
}
```

## 🔐 Security Notes

- All API calls should be authenticated in production
- User IDs should come from your auth system
- Implement proper CORS policies
- Use HTTPS in production

## 📦 Production Deployment

The frontend can be deployed to:

- **Vercel**: `vercel deploy`
- **Netlify**: Connect to Git repo
- **AWS S3 + CloudFront**: Static hosting
- **Your own server**: Build and serve static files

## 🤝 Integration with Existing Apps

These components can be integrated into existing React applications:

1. Copy component files to your project
2. Install dependencies
3. Import and use components
4. Customize styling to match your theme

## 📚 Additional Resources

- Backend API documentation: See `../API.md`
- Database schema: See `../sql/schema.sql`
- Setup guide: See `../SETUP_GUIDE.md`

---

**Need Help?** Check the backend API documentation or contact your development team.

