// Input validation utilities for edge functions
// Simple validation without external dependencies

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateString(
  value: unknown, 
  fieldName: string, 
  options: { 
    required?: boolean; 
    minLength?: number; 
    maxLength?: number;
    pattern?: RegExp;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  
  if (value === undefined || value === null || value === '') {
    if (options.required) {
      errors.push(`${fieldName} is required`);
    }
    return { valid: errors.length === 0, errors };
  }
  
  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return { valid: false, errors };
  }
  
  const trimmed = value.trim();
  
  if (options.minLength && trimmed.length < options.minLength) {
    errors.push(`${fieldName} must be at least ${options.minLength} characters`);
  }
  
  if (options.maxLength && trimmed.length > options.maxLength) {
    errors.push(`${fieldName} must be at most ${options.maxLength} characters`);
  }
  
  if (options.pattern && !options.pattern.test(trimmed)) {
    errors.push(`${fieldName} has invalid format`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  
  if (value === undefined || value === null) {
    if (options.required) {
      errors.push(`${fieldName} is required`);
    }
    return { valid: errors.length === 0, errors };
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (typeof num !== 'number' || isNaN(num)) {
    errors.push(`${fieldName} must be a valid number`);
    return { valid: false, errors };
  }
  
  if (options.integer && !Number.isInteger(num)) {
    errors.push(`${fieldName} must be an integer`);
  }
  
  if (options.min !== undefined && num < options.min) {
    errors.push(`${fieldName} must be at least ${options.min}`);
  }
  
  if (options.max !== undefined && num > options.max) {
    errors.push(`${fieldName} must be at most ${options.max}`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateUUID(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (value === undefined || value === null || value === '') {
    if (options.required) {
      errors.push(`${fieldName} is required`);
    }
    return { valid: errors.length === 0, errors };
  }
  
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    errors.push(`${fieldName} must be a valid UUID`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateEmail(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (value === undefined || value === null || value === '') {
    if (options.required) {
      errors.push(`${fieldName} is required`);
    }
    return { valid: errors.length === 0, errors };
  }
  
  if (typeof value !== 'string' || !emailPattern.test(value)) {
    errors.push(`${fieldName} must be a valid email address`);
  }
  
  if (typeof value === 'string' && value.length > 255) {
    errors.push(`${fieldName} must be at most 255 characters`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateEnum(
  value: unknown,
  fieldName: string,
  allowedValues: string[],
  options: { required?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];
  
  if (value === undefined || value === null || value === '') {
    if (options.required) {
      errors.push(`${fieldName} is required`);
    }
    return { valid: errors.length === 0, errors };
  }
  
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    errors.push(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}

// Combine multiple validation results
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const allErrors: string[] = [];
  let allValid = true;
  
  for (const result of results) {
    if (!result.valid) {
      allValid = false;
      allErrors.push(...result.errors);
    }
  }
  
  return { valid: allValid, errors: allErrors };
}

// Sanitize string input to prevent XSS/injection
export function sanitizeString(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// Validate checkout request
export interface CheckoutRequestValidation {
  order_id: string;
  items: string;
  amount: number;
  currency: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  custom_1?: string;
  custom_2?: string;
  ref_creator?: string;
  discount_code?: string;
}

export function validateCheckoutRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body is required'] };
  }
  
  const data = body as Record<string, unknown>;
  
  return combineValidations(
    validateString(data.order_id, 'order_id', { required: true, maxLength: 100 }),
    validateString(data.items, 'items', { required: true, maxLength: 500 }),
    validateNumber(data.amount, 'amount', { required: true, min: 0 }),
    validateString(data.currency, 'currency', { required: true, maxLength: 10 }),
    validateString(data.first_name, 'first_name', { required: true, maxLength: 100 }),
    validateString(data.last_name, 'last_name', { required: true, maxLength: 100 }),
    validateEmail(data.email, 'email', { required: true }),
    validateString(data.phone, 'phone', { required: true, maxLength: 20 }),
    validateString(data.address, 'address', { required: true, maxLength: 500 }),
    validateString(data.city, 'city', { required: true, maxLength: 100 }),
    validateString(data.country, 'country', { required: true, maxLength: 100 }),
    validateString(data.ref_creator, 'ref_creator', { maxLength: 50 }),
    validateString(data.discount_code, 'discount_code', { maxLength: 50 }),
  );
}

// Validate refund request
export function validateRefundRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body is required'] };
  }
  
  const data = body as Record<string, unknown>;
  
  return combineValidations(
    validateUUID(data.payment_id, 'payment_id', { required: true }),
    validateString(data.reason, 'reason', { required: true, maxLength: 500 }),
    validateString(data.otp_code, 'otp_code', { required: true, maxLength: 10 }),
  );
}

// Validate finalize payment request
export function validateFinalizePaymentRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body is required'] };
  }
  
  const data = body as Record<string, unknown>;
  
  return combineValidations(
    validateString(data.order_id, 'order_id', { required: true, maxLength: 100 }),
    validateNumber(data.final_amount, 'final_amount', { required: true, min: 0 }),
    validateEnum(data.tier, 'tier', ['starter', 'standard', 'lifetime'], { required: true }),
    validateString(data.ref_creator, 'ref_creator', { maxLength: 50 }),
    validateString(data.discount_code, 'discount_code', { maxLength: 50 }),
  );
}
