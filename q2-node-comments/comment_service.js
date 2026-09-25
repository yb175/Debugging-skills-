export class NotFoundError extends Error {}

export class ValidationError extends Error {}

export class CommentService {
  constructor(postStore) {
    this.postStore = postStore;
    // TODO: Initialize in-memory state and concurrency controls.
  }

  addComment(postId, userId, content) {
    /*
     * TODO: Create a comment and return:
     * { id, post_id, user_id, content, created_at, replies: [] }
     *
     * Validate userId and content before checking the post.
     */
  }

  addReply(postId, commentId, userId, content) {
    /*
     * TODO: Create a reply and return:
     * { id, post_id, comment_id, user_id, content, created_at }
     *
     * Validate userId and content, then the post, then the comment.
     */
  }

  getComments(postId) {
    // TODO: Return an isolated snapshot of this post's complete discussion.
  }
}
