# Stage 1

## 1. Core Actions
For a logged-in student interacting with the Campus Notification Platform, the core actions required are:
1. **Fetch Notifications:** Retrieve a paginated list of notifications, with the ability to filter by type (Placements, Events, Results) and read status.
2. **Get Unread Count:** Quickly fetch the number of unread notifications to display on a notification bell badge.
3. **Mark Single Notification as Read:** Update the status of a specific notification when the user clicks on it.
4. **Mark All Notifications as Read:** A bulk action to clear the unread status of all pending notifications.

---

## 2. API Headers Contract
All endpoints require the following standard headers to ensure security and proper payload parsing. The user's identity is extracted dynamically from the JWT token, meaning the frontend never needs to pass the `userId` in the URL or body.

```
{
  "Authorization": "Bearer <jwt_access_token>",
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

---

## 3. REST API Endpoints & JSON Schemas

A. Fetch Notifications

Retrieves the user's notifications. Supports query parameters for filtering and pagination.

- Endpoint: ```GET /api/v1/notifications```
- Query Parameters: * ```page``` (integer, default: 1)
    - ```limit``` (integer, default: 20)
    - ```type``` (string, optional: "placements" | "events" | "results")
    - ```isRead``` (boolean, optional)
- Request Body: None
- Response (200 OK):
```
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_8f72a1b",
        "type": "placements",
        "title": "Amazon Interview Shortlist",
        "message": "Congratulations! You have been shortlisted for the technical round tomorrow at 10 AM.",
        "isRead": false,
        "actionUrl": "/placements/amazon",
        "createdAt": "2023-10-27T14:30:00Z"
      },
      {
        "id": "notif_9b34c2d",
        "type": "events",
        "title": "Annual Tech Symposium",
        "message": "Registrations are now open for the campus tech symposium.",
        "isRead": true,
        "actionUrl": "/events/symposium",
        "createdAt": "2023-10-26T09:15:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 42
    }
  }
}
```

B. Get Unread Notification Count

A lightweight endpoint to poll for the current unread badge count upon initial page load.

- Endpoint: ```GET /api/v1/notifications/unread-count```
- Request Body: None
- Response (200 OK):
```
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

C. Mark Single Notification as Read

Updates a specific notification's status. Using PATCH as it's a partial update of the resource.

- Endpoint: ```PATCH /api/v1/notifications/{notificationId}/read```
- Request Body: None (The action is implied by the endpoint URL)
- Response (200 OK):
```
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "notif_8f72a1b",
    "isRead": true,
    "readAt": "2023-10-27T15:00:00Z"
  }
}
```

- Response (404 Not Found): If the notification ID doesn't exist or doesn't belong to the user.

D. Mark All Notifications as Read

Bulk action to clear all unread flags for the currently authenticated user.

- Endpoint: ```PUT /api/v1/notifications/read-all```
- Request Body: None
- Response (200 OK):
```
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 3
  }
}
```

---

## 4. Real-Time Notification Mechanism

To ensure students receive updates (like sudden interview shortlists or urgent event changes) instantly without refreshing the page, the system will utilize WebSockets.

Architecture & Flow:

1. Connection: When a user logs into the frontend application, the client establishes a persistent WebSocket connection to the backend server (e.g., wss://api.campus.com/v1/ws).
2. Authentication: The client passes its JWT access token during the initial WebSocket handshake to authenticate the connection.
3. Room Subscription: The backend decodes the token, extracts the userId, and subscribes that specific socket connection to a unique channel (e.g., user_room_{userId}).
4. Event Triggering: * When an admin or system service generates a new notification, it writes the record to the database.
    - Immediately after saving, the backend publishes the notification payload to the specific user_room_{userId} via the WebSocket server.
5. Client Receiving: The frontend listens for an event named new_notification. When received, it:
    - Increments the unread badge count dynamically.
    - Displays a temporary toast/snackbar alert with the title and message.
    - Prepends the new notification object to the top of the notification dropdown list.

Real-Time Payload Example (Server to Client):
```
{
  "event": "new_notification",
  "payload": {
     "id": "notif_1a2b3c4",
     "type": "results",
     "title": "Semester 6 Results Declared",
     "message": "Your grades for the Spring semester have been updated on the portal.",
     "isRead": false,
     "createdAt": "2023-10-27T16:05:00Z"
  }
}
```

# Stage 2

## 1.  Persistent Storage Choice

Suggested Database: MongoDB (NoSQL Document Store)

Explanation: MongoDB is an excellent choice for a campus notification system for the following reasons:

1. Write-Heavy Workload: Notifications systems typically experience high write volumes (especially during campus-wide broadcasts). MongoDB excels at rapid, high-throughput ingestions.

2. Schema Flexibility: Different notification types might require different metadata in the future (e.g., an 'event' notification might need an eventId or rsvpLink, while a 'result' might need a score). A NoSQL document structure allows us to store these varying payloads without rigid schema migrations.

3. Horizontal Scalability: As the student base and historical data grow, MongoDB easily scales out across multiple shards to distribute the load natively.

## 2. Database Schema (Document Structure)

In MongoDB, data is stored as BSON documents within a notifications collection.

```
{
  "_id": ObjectId("653bdf1a2e9b1d0012a45678"),
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "type": "placements",
  "title": "Amazon Interview Shortlist",
  "message": "Congratulations! You have been shortlisted...",
  "isRead": false,
  "actionUrl": "/placements/amazon",
  "createdAt": ISODate("2023-10-27T14:30:00Z"),
  "readAt": null
}
```

Required Indexes:

To ensure our API queries run efficiently, we must create the following indexes:

```
db.notifications.createIndex({ userId: 1, createdAt: -1 })

db.notifications.createIndex({ userId: 1, isRead: 1 })
```

## 3. Scalability Problems & Solutions

As the campus platform grows and generates millions of notifications, several issues will arise:

**Problem A: Unbounded Collection Growth:**
Over time, millions of read notifications will bloat the database, slowing down queries and increasing RAM usage.
* **Solution (TTL Indexes):** Use MongoDB's Time-To-Live index to auto-delete documents older than 6 months (`db.notifications.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 15552000 })`).

**Problem B: Heavy Read Load for Unread Counts:**
Constantly running `countDocuments()` every time a student opens the app is resource-heavy.
* **Solution (Caching):** Store the user's unread count in a Redis cache, or maintain an integer counter field directly on the `users` collection, updating it via `$inc` operations.

---

## 4. NoSQL Queries (Stage 1 APIs)

**A. Fetch Notifications (Paginated)**
```
db.notifications.find({ userId: "user-uuid", type: "placements" })
  .sort({ createdAt: -1 })
  .skip(0)
  .limit(20);
```
**B. Get Unread Count**
```
db.notifications.countDocuments({ userId: "user-uuid", isRead: false });
```
**C. Mark Single as Read**
```
db.notifications.findOneAndUpdate(
  { _id: ObjectId("notif-id"), userId: "user-uuid", isRead: false },
  { $set: { isRead: true, readAt: new ISODate() } },
  { returnDocument: "after" }
);
```
**D. Mark All as Read**
```
db.notifications.updateMany(
  { userId: "user-uuid", isRead: false },
  { $set: { isRead: true, readAt: new ISODate() } }
);
```

# Stage 3

## 1. Query Analysis

Yes, the query accurately retrieves unread notifications for a specific student and sorts them by newest first.

It is slow because without an appropriate index, the database engine must perform a Full Table Scan. It reads through all 5,000,000 rows to find the matching studentID and isRead values, and then performs a computationally expensive in-memory sort on createdAt before returning the results.

## 2. Optimization

Create a Composite Index on (studentID, isRead, createdAt).

- Before Index: O(N) where N is 5,000,000 rows.

- After Index: The DB engine traverses a B-Tree structure directly to the relevant records. The time complexity drops to O(log N) for the lookup. Because the index also stores createdAt, the sorting is pre-computed, eliminating the sort overhead entirely.

## 3. Index Every Column

No, this is terrible advice.

Every time a new notification is inserted, updated, or deleted, every single index must also be updated. This severely degrades write performance.

Indexes consume significant disk space and RAM. Indexing 5,000,000 rows across every column would bloat the database massively.

## 4. Placement Notifications Query
```
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= CURRENT_DATE - INTERVAL '7 days';
```