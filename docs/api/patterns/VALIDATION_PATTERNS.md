# Validation Patterns

**Input Validation & Sanitization**

---

## Overview

Input validation is the first line of defense against:
- SQL injection
- XSS attacks
- Invalid data states
- Business logic errors

---

## Joi Schema Validation

### Schema Definitions

```typescript
import Joi from 'joi';

// Common schemas
const schemas = {
  uuid: Joi.string().uuid({ version: 'uuidv4' }),
  
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .lowercase()
    .trim(),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .message('Password must contain uppercase, lowercase, and number'),
  
  name: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .pattern(/^[\p{L}\p{N}\s\-'.]+$/u)
    .message('Name contains invalid characters'),
  
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('created_at', 'updated_at', 'title').default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })
};
```

### Story Schema

```typescript
const storySchema = {
  create: Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .required()
      .trim(),
    
    characterId: schemas.uuid.required(),
    
    storyType: Joi.string()
      .valid('bedtime', 'adventure', 'educational', 'therapeutic', 'celebration')
      .required(),
    
    themes: Joi.array()
      .items(Joi.string().max(50))
      .max(5)
      .default([]),
    
    targetAge: Joi.number()
      .integer()
      .min(1)
      .max(18)
      .optional(),
    
    settings: Joi.object({
      language: Joi.string().length(2).default('en'),
      includeAudio: Joi.boolean().default(true),
      includePdf: Joi.boolean().default(false)
    }).default()
  }),
  
  update: Joi.object({
    title: Joi.string().min(1).max(200).trim(),
    themes: Joi.array().items(Joi.string().max(50)).max(5),
    settings: Joi.object({
      language: Joi.string().length(2),
      includeAudio: Joi.boolean(),
      includePdf: Joi.boolean()
    })
  }).min(1) // At least one field required
};
```

### Character Schema

```typescript
const characterSchema = {
  create: Joi.object({
    name: schemas.name.required(),
    
    species: Joi.string()
      .valid('human', 'cat', 'dog', 'dragon', 'unicorn', 'robot', 'alien', 'bird', 'bear')
      .required(),
    
    traits: Joi.object({
      // Inclusivity traits
      skinTone: Joi.string().optional(),
      hairColor: Joi.string().optional(),
      hairStyle: Joi.string().optional(),
      eyeColor: Joi.string().optional(),
      accessibilityDevice: Joi.string().optional(),
      
      // Personality
      personality: Joi.array().items(Joi.string()).max(5),
      interests: Joi.array().items(Joi.string()).max(10),
      fears: Joi.array().items(Joi.string()).max(5)
    }).default({}),
    
    profileId: schemas.uuid.optional()
  }),
  
  update: Joi.object({
    name: schemas.name,
    traits: Joi.object()
  }).min(1)
};
```

---

## Validation Middleware

```typescript
function validate(schema: Joi.Schema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,      // Collect all errors
      stripUnknown: true,     // Remove unknown fields
      convert: true           // Type coercion
    });
    
    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, "'"),
        type: d.type,
        value: d.context?.value
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'ERR_2001',
        details: { fields: details }
      });
    }
    
    // Replace with sanitized/converted values
    req[source] = value;
    next();
  };
}

// Usage
app.post('/api/v1/stories',
  authMiddleware,
  validate(storySchema.create),
  createStoryHandler
);

app.get('/api/v1/stories',
  authMiddleware,
  validate(schemas.pagination, 'query'),
  listStoriesHandler
);
```

---

## Sanitization

### HTML Sanitization

```typescript
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

// For plain text only (no HTML allowed)
function sanitizePlainText(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
```

### SQL Injection Prevention

```typescript
// Always use parameterized queries with Supabase
// NEVER concatenate user input into queries

// ❌ WRONG - Vulnerable
const badQuery = `SELECT * FROM stories WHERE title = '${userInput}'`;

// ✅ CORRECT - Parameterized
const { data } = await supabase
  .from('stories')
  .select('*')
  .eq('title', userInput);

// For raw SQL (when needed)
const { data } = await supabase.rpc('search_stories', {
  search_term: userInput  // Passed as parameter
});
```

---

## Custom Validators

### COPPA Age Validation

```typescript
const ageValidator = Joi.custom((value, helpers) => {
  const birthDate = new Date(value);
  const today = new Date();
  const age = Math.floor(
    (today.getTime() - birthDate.getTime()) / 
    (365.25 * 24 * 60 * 60 * 1000)
  );
  
  if (age < 0 || age > 120) {
    return helpers.error('date.invalid');
  }
  
  // Flag for COPPA consent if under 13
  if (age < 13) {
    return helpers.state.ancestors[0].requiresCoppa = true;
  }
  
  return value;
}, 'age validation');

const profileSchema = Joi.object({
  name: schemas.name.required(),
  birthDate: ageValidator.required(),
  parentEmail: Joi.string()
    .email()
    .when('$requiresCoppa', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
});
```

### Profanity Filter

```typescript
import Filter from 'bad-words';

const filter = new Filter();
filter.addWords('custom', 'blocked', 'words');

const cleanTextValidator = Joi.custom((value, helpers) => {
  if (filter.isProfane(value)) {
    return helpers.error('string.profanity');
  }
  return filter.clean(value); // Replace profanity with asterisks
}, 'profanity check');

Joi.string().extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.profanity': '{{#label}} contains inappropriate language'
  },
  rules: {
    clean: {
      validate(value, helpers) {
        if (filter.isProfane(value)) {
          return helpers.error('string.profanity');
        }
        return value;
      }
    }
  }
}));
```

---

## Request Size Limits

```typescript
import express from 'express';

// Global body size limit
app.use(express.json({ limit: '1mb' }));

// Per-route limits
app.post('/api/v1/import',
  express.json({ limit: '50mb' }),
  authMiddleware,
  importHandler
);

// File upload limits
app.post('/api/v1/avatars',
  authMiddleware,
  multer({
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    }
  }).single('avatar'),
  uploadAvatarHandler
);
```

---

## Error Messages

### User-Friendly Messages

```typescript
const errorMessages = {
  'string.empty': '{#label} cannot be empty',
  'string.min': '{#label} must be at least {#limit} characters',
  'string.max': '{#label} cannot exceed {#limit} characters',
  'string.email': '{#label} must be a valid email address',
  'number.min': '{#label} must be at least {#limit}',
  'number.max': '{#label} cannot exceed {#limit}',
  'any.required': '{#label} is required',
  'array.max': '{#label} cannot have more than {#limit} items',
  'any.only': '{#label} must be one of: {#valids}'
};

const schema = Joi.object({
  email: Joi.string().email().required()
}).messages(errorMessages);
```

---

## Frontend Validation

### Wized Form Validation

```javascript
// Match backend validation rules
const validators = {
  email: (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value) ? null : 'Please enter a valid email';
  },
  
  password: (value) => {
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
    if (!/\d/.test(value)) return 'Password must contain a number';
    return null;
  },
  
  name: (value) => {
    if (!value.trim()) return 'Name is required';
    if (value.length > 100) return 'Name is too long';
    return null;
  }
};

// Validate before submit
function validateForm(data, rules) {
  const errors = {};
  for (const [field, validator] of Object.entries(rules)) {
    const error = validator(data[field]);
    if (error) errors[field] = error;
  }
  return Object.keys(errors).length ? errors : null;
}
```

---

**Last Updated**: December 23, 2025

