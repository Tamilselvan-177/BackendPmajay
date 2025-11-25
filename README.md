# PM-AJAY Backend API

A comprehensive backend system for managing projects, work packages, and documents with role-based access control (Collector, Officer, Prime Minister).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [User Roles](#user-roles)
- [Project Structure](#project-structure)

---

## Prerequisites

- **Node.js** v14+ and npm
- **MongoDB** (cloud or local)
- **Postman** (for API testing)

---

## Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify key packages**
   - `express` - Web framework
   - `mongoose` - MongoDB ODM
   - `bcryptjs` - Password hashing
   - `jsonwebtoken` - JWT authentication
   - `cors` - Cross-Origin Resource Sharing
   - `multer` - File uploads

---

## Environment Setup

Create a `.env` file in the root of the backend folder:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=<app-name>
```

**Environment Variables:**
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (`development` or `production`)
- `JWT_SECRET` - Secret key for JWT token signing (change in production)
- `MONGO_URI` - MongoDB connection string

---

## Running the Server

```bash
# Development mode
node server.js

# Or with nodemon for auto-reload (if installed)
npm run dev
```

**Expected output:**
```
🚀 Server running on port 5000
```

### Test the server
```bash
curl http://localhost:5000
# Response: { "message": "PM-AJAY API is running" }
```

---

## API Documentation

### Base URL
```
http://localhost:5000/api
```

---

## Authentication

### Login
**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "username": "officer1",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "officer1",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "officer"
  }
}
```

### Using the Token
Add the token to all subsequent requests:
```
Authorization: Bearer <token>
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| **primeminister** | View all projects, dashboards, and reports |
| **collector** | Review and approve work packages and documents from assigned officers |
| **officer** | Create work packages, upload documents |

---

## Project Routes

### Get My Projects (Officer)
**Endpoint:** `GET /projects/my-requests`  
**Auth:** Required (Officer role)  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "projectName": "School Construction",
      "amount": 500000,
      "status": "active",
      "village": { "_id": "...", "villageName": "..." }
    }
  ]
}
```

### Get All Projects (Prime Minister)
**Endpoint:** `GET /projects`  
**Auth:** Required (Prime Minister role)  
**Response:** Array of all projects

### Create Project (Officer)
**Endpoint:** `POST /projects`  
**Auth:** Required (Officer role)  
**Request Body:**
```json
{
  "projectName": "School Construction",
  "amount": 500000,
  "scheme": "507f1f77bcf86cd799439011",
  "village": "507f1f77bcf86cd799439011"
}
```

---

## Work Package Routes

### Create Work Package with Document (Officer)
**Endpoint:** `POST /work-packages/request`  
**Auth:** Required (Officer role)  
**Request Type:** `multipart/form-data`  
**Fields:**
- `projectId` (string) - MongoDB ObjectId of the project
- `title` (string) - Work package title
- `amount` (number) - Amount for this package
- `documentType` (string) - Type of document
- `document` (file) - Document file upload

**Response:**
```json
{
  "success": true,
  "message": "Request submitted",
  "work": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Foundation Work",
    "amount": 100000,
    "status": "pending"
  },
  "doc": {
    "_id": "507f1f77bcf86cd799439012",
    "documentType": "invoice",
    "fileName": "invoice_001.pdf",
    "fileUrl": "/uploads/invoice_001.pdf"
  }
}
```

### Get Work Packages for Collector by Project
**Endpoint:** `GET /work-packages/project/:projectId`  
**Auth:** Required (Collector role)  
**URL Parameters:**
- `projectId` (string) - MongoDB ObjectId of the project

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Foundation Work",
      "amount": 100000,
      "status": "pending",
      "createdBy": {
        "_id": "...",
        "fullName": "Officer Name",
        "email": "officer@example.com"
      },
      "project": {
        "_id": "...",
        "projectName": "School Construction"
      },
      "documents": [...]
    }
  ]
}
```

### Get Pending Work Packages (Collector)
**Endpoint:** `GET /work-packages/pending`  
**Auth:** Required (Collector role)  
**Response:** Array of pending work packages assigned to the collector

### Upload Additional Document to Work Package (Officer)
**Endpoint:** `POST /work-packages/:packageId/upload`  
**Auth:** Required (Officer role)  
**Request Type:** `multipart/form-data`  
**URL Parameters:**
- `packageId` (string) - MongoDB ObjectId of the work package

**Fields:**
- `documentType` (string) - Type of document
- `document` (file) - Document file

**Response:**
```json
{
  "success": true,
  "doc": {
    "_id": "507f1f77bcf86cd799439012",
    "documentType": "invoice",
    "fileName": "invoice_002.pdf",
    "fileUrl": "/uploads/invoice_002.pdf"
  }
}
```

### Review Individual Document (Collector)
**Endpoint:** `PUT /work-packages/documents/:docId/review`  
**Auth:** Required (Collector role)  
**URL Parameters:**
- `docId` (string) - MongoDB ObjectId of the document

**Request Body:**
```json
{
  "decision": "approved",
  "comments": "Document looks good"
}
```

**Possible decisions:** `approved`, `rejected`

**Response:**
```json
{
  "success": true,
  "doc": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "approved",
    "reviewComments": "Document looks good",
    "reviewedBy": "507f1f77bcf86cd799439013",
    "reviewedAt": "2025-11-25T10:30:00Z"
  }
}
```

### Review Work Package (Collector - Final Approval/Rejection)
**Endpoint:** `PUT /work-packages/:packageId/review`  
**Auth:** Required (Collector role)  
**URL Parameters:**
- `packageId` (string) - MongoDB ObjectId of the work package

**Request Body:**
```json
{
  "decision": "approved",
  "reason": "All documents verified"
}
```

**Possible decisions:** `approved`, `rejected`

**Note:** All documents must be `approved` before the work package can be approved.

**Response:**
```json
{
  "success": true,
  "work": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "approved",
    "title": "Foundation Work"
  }
}
```

### Get Work Package History
**Endpoint:** `GET /work-packages/:packageId/history`  
**Auth:** Required  
**URL Parameters:**
- `packageId` (string) - MongoDB ObjectId of the work package

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "action": "Work Package Submitted",
      "status": "pending",
      "performedBy": {
        "_id": "...",
        "fullName": "Officer Name",
        "role": "officer"
      },
      "createdAt": "2025-11-25T10:00:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "action": "Document Uploaded",
      "status": "pending",
      "performedBy": {
        "_id": "...",
        "fullName": "Officer Name",
        "role": "officer"
      },
      "createdAt": "2025-11-25T10:15:00Z"
    }
  ]
}
```

---

## Document Routes

### Get Documents (filtered by role and location)
**Endpoint:** `GET /documents`  
**Auth:** Required  
**Response:** Documents filtered by user's role and village/location

### Approve/Reject Document (Collector)
**Endpoint:** `PUT /documents/:docId/approve`  
**Auth:** Required (Collector role)  
**Request Body:**
```json
{
  "decision": "approved",
  "comments": "Document verified"
}
```

---

## Location Routes

### Get States
**Endpoint:** `GET /location/states`  
**Auth:** Optional  
**Response:** Array of all states

### Get Districts by State
**Endpoint:** `GET /location/districts/:stateId`  
**Auth:** Optional  
**URL Parameters:**
- `stateId` (string) - MongoDB ObjectId of the state

### Get Blocks by District
**Endpoint:** `GET /location/blocks/:districtId`  
**Auth:** Optional  
**URL Parameters:**
- `districtId` (string) - MongoDB ObjectId of the district

### Get Villages by Block
**Endpoint:** `GET /location/villages/:blockId`  
**Auth:** Optional  
**URL Parameters:**
- `blockId` (string) - MongoDB ObjectId of the block

---

## Village Routes

### Get All Villages
**Endpoint:** `GET /villages`  
**Auth:** Optional  
**Response:** Array of all villages with their location data

---

## Project Structure

```
backend/
├── config/              # Configuration files
│   └── db.js           # MongoDB connection
├── controllers/         # Business logic
│   ├── authController.js
│   ├── projectController.js
│   ├── workPackageController.js
│   ├── documentController.js
│   └── locationController.js
├── middleware/         # Express middleware
│   ├── authMiddleware.js       # JWT verification & role checking
│   ├── logger.js               # Request logging
│   └── uploadMiddleware.js     # Multer configuration
├── models/            # Mongoose schemas
│   ├── User.js
│   ├── Project.js
│   ├── WorkPackage.js
│   ├── WorkPackageDocument.js
│   ├── WorkPackageHistory.js
│   ├── State.js
│   ├── District.js
│   ├── Block.js
│   └── Village.js
├── routes/            # API routes
│   ├── authRoutes.js
│   ├── projectRoutes.js
│   ├── workPackageRoutes.js
│   ├── documentRoutes.js
│   ├── locationRoutes.js
│   └── villageRoutes.js
├── seeders/           # Database seed scripts
│   ├── userSeed.js
│   ├── schemesSeed.js
│   └── villagecreate.js
├── uploads/           # User uploaded files
├── server.js          # Express app entry point
├── package.json       # Dependencies
└── .env              # Environment variables
```

---

## CORS Configuration

The backend is configured to accept requests from frontend applications. The CORS middleware is set up in `server.js`:

```javascript
- Allows all origins (can be restricted to specific domains in production)
- Allows methods: GET, POST, PUT, DELETE, OPTIONS
- Allows headers: Content-Type, Authorization
- Credentials are enabled for cookie/auth support
```

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "message": "Error description",
  "stack": "..." // (only in development mode)
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## Testing with Postman

1. **Import Collection:** Create a Postman collection with the endpoints listed above
2. **Add Authorization:** Use Bearer token authentication
3. **Set Variables:** Store token and base URL as environment variables
4. **Test Workflows:**
   - Officer creates work package → Collector reviews → Approves/Rejects

---

## Troubleshooting

### CORS Error
- Ensure `server.js` has CORS middleware configured
- Check that the frontend and backend URLs match the configured origins
- Verify browser preflight OPTIONS request receives correct headers

### MongoDB Connection Error
- Verify `MONGO_URI` in `.env` is correct
- Check MongoDB user credentials and IP whitelist
- Ensure network connectivity to MongoDB Atlas

### JWT Token Expired
- Request a new token via `/auth/login`
- Implement token refresh logic in the frontend

### File Upload Issues
- Check that the `uploads/` directory exists and has write permissions
- Verify `uploadMiddleware.js` configuration matches expected file types
- Check multer file size limits in `uploadMiddleware.js`

---

## Future Enhancements

- [ ] Add email notifications for approvals/rejections
- [ ] Implement document versioning
- [ ] Add advanced search and filtering
- [ ] Generate PDF reports
- [ ] Implement audit logging
- [ ] Add API rate limiting

---

## Support

For issues or questions, please contact the development team or create an issue in the repository.
