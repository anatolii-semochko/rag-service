# Frontend Architecture

This document describes the refactored frontend architecture for the RAG Service application.

## 🏗️ Project Structure

```
src/
├── api/                    # API layer
│   ├── client.js          # HTTP client for making requests
│   ├── config.js          # API configuration
│   └── services.js        # Service classes for different endpoints
├── components/            # UI Components
│   ├── common/           # Reusable components
│   │   └── BaseComponent.js # Base component class
│   ├── tabs/             # Tab-specific components
│   │   ├── ChatTab.js    # Chat interface component
│   │   ├── DocumentsTab.js # Documents management (TODO)
│   │   └── AuditTab.js   # Audit interface (TODO)
│   └── forms/            # Form components (TODO)
├── services/             # Business logic services
├── utils/                # Utility functions
│   ├── dom.js            # DOM manipulation helpers
│   └── helpers.js        # General utility functions
├── styles/               # CSS modules
│   ├── base/             # Base styles
│   │   ├── reset.css     # CSS reset
│   │   └── variables.css # CSS custom properties
│   ├── components/       # Component-specific styles
│   │   ├── buttons.css   # Button styles
│   │   └── chat.css      # Chat component styles
│   └── main.css          # Main CSS entry point
├── assets/               # Static assets
│   ├── icons/            # Icon files
│   └── images/           # Image files
└── App.js                # Main application class
```

## 🎯 Architecture Principles

### 1. Component-Based Architecture
- **BaseComponent**: Provides common functionality for all components
- **State Management**: Simple setState/getState pattern
- **Event Handling**: Centralized event management with cleanup
- **Lifecycle Methods**: Mount, unmount, render hooks

### 2. Separation of Concerns
- **API Layer**: All API communication isolated in services
- **Components**: Pure UI logic without business logic
- **Utilities**: Reusable helper functions
- **Styles**: Modular CSS with CSS custom properties

### 3. Modern ES6+ Features
- **ES Modules**: Import/export for dependency management
- **Classes**: Object-oriented component structure
- **Async/Await**: Modern promise handling
- **Template Literals**: Dynamic HTML generation

## 🔧 Key Components

### BaseComponent Class
Base class providing:
- State management
- Event handling with cleanup
- DOM manipulation helpers
- Component lifecycle
- Data binding utilities

```javascript
export class MyComponent extends BaseComponent {
  constructor() {
    super();
    this.state = { data: [] };
  }

  template() {
    return `<div>${this.state.data.length} items</div>`;
  }

  onMount() {
    this.loadData();
  }
}
```

### API Services
Organized by domain:
- **CategoriesService**: Category CRUD operations
- **CollectionsService**: Collection management
- **DocumentsService**: Document operations
- **ChatService**: Chat and RAG functionality
- **VectorService**: Vector search operations

### Utility Functions
Comprehensive helpers for:
- DOM manipulation
- File operations
- Date formatting
- String utilities
- Array operations
- Local storage
- Validation

## 🎨 Styling System

### CSS Architecture
- **CSS Custom Properties**: Consistent design tokens
- **Component-Based**: Styles co-located with components
- **Responsive Design**: Mobile-first approach
- **Utility Classes**: Common styling patterns

### Design System
```css
:root {
  /* Colors */
  --color-primary: #007bff;
  --color-success: #28a745;

  /* Spacing */
  --space-sm: 0.5rem;
  --space-md: 1rem;

  /* Typography */
  --font-size-sm: 0.875rem;
  --font-weight-medium: 500;
}
```

## 🚀 Getting Started

### Development Workflow
1. **Component Development**: Create new components extending BaseComponent
2. **API Integration**: Use existing services or create new ones
3. **Styling**: Add component-specific CSS modules
4. **Testing**: Test components in isolation

### Adding New Components
```javascript
// 1. Create component file
import { BaseComponent } from '../common/BaseComponent.js';

export class NewComponent extends BaseComponent {
  // Component implementation
}

// 2. Add CSS module
@import './new-component.css';

// 3. Register in main app
import { NewComponent } from './components/NewComponent.js';
```

## 📝 Best Practices

### Component Guidelines
- **Single Responsibility**: One component, one purpose
- **State Management**: Use setState for updates
- **Event Cleanup**: Always clean up event listeners
- **Performance**: Only render when necessary

### CSS Guidelines
- **BEM Methodology**: Block__Element--Modifier
- **Component Scope**: Prefix with component name
- **Responsive Design**: Mobile-first media queries
- **Performance**: Use CSS custom properties

### API Guidelines
- **Error Handling**: Always handle API errors
- **Loading States**: Show loading indicators
- **Type Safety**: Validate response data
- **Caching**: Consider response caching

## 🔄 Migration Notes

The refactoring from the monolithic structure provides:
- **Better Maintainability**: Code is organized and modular
- **Easier Testing**: Components can be tested in isolation
- **Improved Performance**: Lazy loading and optimized rendering
- **Developer Experience**: Better IDE support and debugging
- **Scalability**: Easy to add new features and components

## 🎯 Future Enhancements

- **TypeScript**: Add type safety
- **Testing Framework**: Unit and integration tests
- **State Management**: Global state if needed
- **PWA Features**: Service workers, offline support
- **Build System**: Webpack/Vite for optimization
- **Documentation**: Component documentation system