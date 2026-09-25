# Q2: In-memory comments and replies

## What you should know

You should be comfortable with:

- In-memory data modeling
- Parent-child resource relationships
- Input validation and error handling
- Basic concurrency and locking

## Scenario

The discussion platform currently supports posts. Add comments and replies to it.

Users should be able to leave a comment on a post and reply to someone else's comment. The Express server and mock post store are provided, so the implementation belongs in `comment_service.js`.

The server expects `CommentService` to handle writes and return the complete discussion under a post.

The system supports exactly two levels of discussion:

```text
Post -> Comment -> Reply
```

A reply belongs directly to a comment, with no deeper nesting.

## Goal

Finish the in-memory service behind the comment API. The objects it returns must match the contract below exactly.

## Requirements

The service must:

- add comments to existing posts
- add replies to existing comments
- use independent auto-incrementing integer ID sequences for comments and replies
- return objects matching the expected shapes
- prevent callers from mutating internal state through returned objects
- be safe under concurrent requests

## Available posts

Read the initial posts from `post_store.js`. The mock post store has two posts:

```text
10: "Welcome to LeetCode"
20: "System Design Guide"
```

Any operation that refers to a missing `postId` must fail.

## API contract

For both write methods, `userId` and `content` must be strings with at least one non-whitespace character. Reject `null`, `undefined`, other data types, empty strings, and strings made only of whitespace.

Validation order matters to the tests. Check `userId` and `content` before looking up the post. When adding a reply, look up the post next, then check that the comment exists under that post.

### Add comment

```js
addComment(postId, userId, content) // -> object
```

Creates a comment on an existing post and returns:

```js
{
  id: 1,
  post_id: 10,
  user_id: 'u1',
  content: 'Hello Leet',
  created_at: 1781086734.00,
  replies: []
}
```

Validation:

- Throws `NotFoundError` if `postId` does not exist.
- Throws `ValidationError` if `userId` or `content` is not a string or is empty after trimming whitespace.

### Add reply

```js
addReply(postId, commentId, userId, content) // -> object
```

Creates a reply to an existing comment and returns:

```js
{
  id: 1,
  post_id: 10,
  comment_id: 1,
  user_id: 'u2',
  content: 'Hi Code',
  created_at: 1781086739.00
}
```

Validation:

- Throws `NotFoundError` if `postId` does not exist.
- Throws `NotFoundError` if `commentId` does not exist, or belongs to a different post.
- Throws `ValidationError` if `userId` or `content` is not a string or is empty after trimming whitespace.

### Get comments

```js
getComments(postId) // -> array
```

Returns the post's entire comment thread. Use the same shapes and data types returned by `addComment` and `addReply`.

```js
[
  {
    id: 1,
    post_id: 10,
    user_id: 'u1',
    content: 'Great explanation!',
    created_at: 1710000000.0,
    replies: [
      {
        id: 1,
        post_id: 10,
        comment_id: 1,
        user_id: 'u2',
        content: 'I agree.',
        created_at: 1710000001.0
      }
    ]
  }
]
```

If the post exists but has no comments, return `[]`.

## Expected semantics

### General

- Comments belong to exactly one post.
- Replies belong to exactly one comment.
- Replies are not recursive.
- State must be isolated per post.
- Comment IDs and reply IDs must be independent sequences.
- Returned objects must be safe to mutate without changing internal service state.
- `created_at` must be returned in seconds.

### Ordering

- Comments must be returned in creation order.
- Replies must be returned in creation order.
- Creation order means the order in which the service successfully commits each operation.
- `created_at` is response metadata and must not be the source of truth for ordering.

### Concurrency

Requests can reach the service concurrently. IDs must stay unique, writes must not corrupt one another, and activity on one post must not leak into another.

JavaScript runs synchronous service methods atomically on one Node.js event loop. Keep service writes synchronous; if the design introduces `await`, worker threads, or multiple processes, use suitable coordination instead. A single in-process lock is sufficient for the exercise if one is used.

## Complexity

After correctness, pay attention to the basic cost of each operation:

- Adding a comment should be efficient.
- Adding a reply should avoid unnecessary full-system scans.
- Retrieving comments should be proportional to the number of comments and replies returned.

## Examples

### Comment and reply

```js
const comment = service.addComment(10, 'u1', 'Hello Leet');
// { id: 1, post_id: 10, user_id: 'u1', content: 'Hello Leet', created_at: ..., replies: [] }

const reply = service.addReply(10, comment.id, 'u2', 'Hi Code');
// { id: 1, post_id: 10, comment_id: 1, user_id: 'u2', content: 'Hi Code', created_at: ... }

service.getComments(10);
// [{ id: 1, post_id: 10, user_id: 'u1', content: 'Hello Leet', created_at: ..., replies: [reply] }]
```

### Post isolation

1. Create a comment on post `10`.
2. Try to add a reply to that comment using `postId = 20`.
3. The reply must throw `NotFoundError` because the comment belongs to post `10`.

### Independent IDs

```text
First comment ID = 1
First reply ID   = 1
```

Both values are `1` because comments and replies use different counters.

### Mutation safety

1. Retrieve comments for a post.
2. Modify the returned array or objects.
3. Retrieve comments again.
4. The second result must still contain the original stored values.

## Files

- `server.js`: completed Express server, provided for reference
- `post_store.js`: completed mock post store, provided for reference
- `comment_service.js`: the file to implement
- `test_client.js`: smoke test
- `README.md`: this file
- `package.json`: local dependencies and scripts
- `REFLECTION.essay`: thoughts on locking strategy, snapshot semantics, and horizontal scaling

All implementation changes belong in `comment_service.js` and `REFLECTION.essay`.

## Running locally

Install dependencies:

```bash
npm install
```

Run the server:

```bash
npm start
```

In another terminal, run the smoke test:

```bash
npm run smoke
```

The smoke test is only a quick check. Hidden tests also cover edge cases, concurrent calls, mutation safety, validation order, and response shape.
