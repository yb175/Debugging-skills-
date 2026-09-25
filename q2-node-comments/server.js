import express from 'express';

import { CommentService, NotFoundError, ValidationError } from './comment_service.js';
import { PostStore } from './post_store.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const service = new CommentService(new PostStore());

app.use(express.json());

function sendServiceError(error, response, next) {
  if (error instanceof ValidationError) {
    return response.status(400).json({ error: error.message });
  }
  if (error instanceof NotFoundError) {
    return response.status(404).json({ error: error.message });
  }
  return next(error);
}

app.get('/health', (_, response) => response.json({ status: 'ok' }));

app.post('/post/:postId/comment/add', (request, response, next) => {
  try {
    const result = service.addComment(
      Number(request.params.postId),
      request.body?.user_id,
      request.body?.content
    );
    response.status(201).json(result);
  } catch (error) {
    sendServiceError(error, response, next);
  }
});

app.post('/post/:postId/comment/:commentId/reply', (request, response, next) => {
  try {
    const result = service.addReply(
      Number(request.params.postId),
      Number(request.params.commentId),
      request.body?.user_id,
      request.body?.content
    );
    response.status(201).json(result);
  } catch (error) {
    sendServiceError(error, response, next);
  }
});

app.get('/post/:postId/comments', (request, response, next) => {
  try {
    response.json(service.getComments(Number(request.params.postId)));
  } catch (error) {
    sendServiceError(error, response, next);
  }
});

app.use((error, _, response, __) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ error: 'request body must be valid JSON' });
  }
  return response.status(500).json({ error: 'internal server error' });
});

if (import.meta.main) {
  app.listen(port, () => {
    console.log(`Comments & Replies server listening on http://localhost:${port}`);
  });
}

export { app, service };
