/**
 * Static task list - mirrors backend TASKS for instant load.
 * Backend still validates task_id when creating battles.
 */
export const TASKS = [
  {
    id: 'rest-api',
    title: 'Build a REST API',
    description: 'Create a Node.js REST API with 3 endpoints: GET /users, POST /users, DELETE /users/:id',
    acceptance_criteria: [
      'All 3 endpoints work correctly',
      'Proper HTTP status codes',
      'Basic validation implemented',
    ],
    difficulty: 'medium',
    expected_iterations: { traditional: 8, ralph: 4 },
    prompt_template: `Create a Node.js Express REST API with the following endpoints:
- GET /users - returns array of users
- POST /users - creates a new user (accepts name, email)
- DELETE /users/:id - deletes user by id

Include proper error handling and validation. Use an in-memory array for storage.`,
  },
  {
    id: 'todo-component',
    title: 'React Todo Component',
    description: 'Build a functional React Todo component with add, complete, and delete functionality',
    acceptance_criteria: [
      'Can add new todos',
      'Can mark todos complete',
      'Can delete todos',
      'Proper state management',
    ],
    difficulty: 'easy',
    expected_iterations: { traditional: 6, ralph: 3 },
    prompt_template: `Create a React functional component called TodoApp that:
- Has an input field to add new todos
- Displays a list of todos
- Each todo can be marked as complete (strikethrough)
- Each todo has a delete button
- Uses useState for state management
- Has clean, readable code`,
  },
  {
    id: 'data-processor',
    title: 'Data Processing Script',
    description: 'Write a Python script that processes CSV data and generates statistics',
    acceptance_criteria: [
      'Reads CSV file correctly',
      'Calculates mean, median, mode',
      'Handles missing values',
      'Outputs clean report',
    ],
    difficulty: 'medium',
    expected_iterations: { traditional: 7, ralph: 4 },
    prompt_template: `Write a Python script that:
1. Reads a CSV file with columns: id, name, age, salary
2. Calculates statistics: mean, median, mode for numeric columns
3. Handles missing/invalid values gracefully
4. Prints a formatted report of the statistics
Use pandas library. Include error handling.`,
  },
  {
    id: 'unit-tests',
    title: 'Unit Test Suite',
    description: 'Write comprehensive unit tests for a calculator class',
    acceptance_criteria: [
      'Tests all basic operations',
      'Edge cases covered',
      'Error cases tested',
      'Good test structure',
    ],
    difficulty: 'easy',
    expected_iterations: { traditional: 5, ralph: 3 },
    prompt_template: `Write unit tests for a Calculator class with methods: add, subtract, multiply, divide.
- Test basic functionality for each method
- Test edge cases (zero, negative numbers, large numbers)
- Test error handling (division by zero)
- Use pytest framework
- Include clear test names and docstrings`,
  },
  {
    id: 'auth-middleware',
    title: 'Authentication Middleware',
    description: 'Create JWT authentication middleware for Express.js',
    acceptance_criteria: [
      'Validates JWT tokens',
      'Handles expired tokens',
      'Proper error responses',
      'Protects routes correctly',
    ],
    difficulty: 'hard',
    expected_iterations: { traditional: 10, ralph: 5 },
    prompt_template: `Create an Express.js JWT authentication middleware that:
1. Extracts JWT from Authorization header (Bearer token)
2. Validates the token signature
3. Checks token expiration
4. Attaches decoded user info to request
5. Returns appropriate error responses
Use jsonwebtoken library. Include helper functions for token generation.`,
  },
];
