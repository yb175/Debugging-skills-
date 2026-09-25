export class NotFoundError extends Error {}

export class ValidationError extends Error {}

class reply {
  static id = 0;
  post_id;
  comment_id;
  user_id;
  content;
  created_at;

  constructor(postId, commentId, userId, content) {
    reply.id++;
    this.id = reply.id;
    this.post_id = postId;
    ((this.comment_id = commentId),
      (this.user_id = userId),
      (this.content = content));
    this.created_at = Date.now() / 1000;
  }
}

class comment {
  static id = 0;
  postId;
  user_id;
  content;
  created_at;
  replies;

  constructor(postId, userId, content) {
    comment.id++;
    this.id = comment.id;
    this.postId = postId;
    this.user_id = userId;
    this.content = content;
    this.created_at = Date.now() / 1000;
    this.replies = [];
  }

  addReply(reply) {
    this.replies.push(reply);
  }
}

function validate(userId, content) {
  if (typeof userId !== "string" || !userId?.trim())
    throw new ValidationError("user id non existent");
  if (typeof content !== "string" || !content?.trim())
    throw new ValidationError("content non existent");
}
export class CommentService {
  constructor(postStore) {
    this.postStore = postStore;
    // index between post and comment[]
    // 1 to many relationship
    this.index = new Map();
  }

  addComment(postId, userId, content) {
    /*
     * Create a comment and return:
     * { id, post_id, user_id, content, created_at, replies: [] }
     *
     * Validate userId and content before checking the post.
     */
    validate(userId, content);
    if (!this.postStore.exists(postId)) {
      throw new NotFoundError("post not found");
    }

    const newComment = new comment(postId, userId, content);
    if (!this.index.get(postId)) {
      this.index.set(postId, []);
    }

    const comments = this.index.get(postId);
    comments.push(newComment);

    return {
      id: newComment.id,
      post_id: newComment.postId,
      user_id: newComment.user_id,
      content: newComment.content,
      created_at: newComment.created_at,
      replies: newComment.replies,
    };
  }

  addReply(postId, commentId, userId, content) {
    /*
     * Create a reply and return:
     * { id, post_id, comment_id, user_id, content, created_at }
     *
     * Validate userId and content, then the post, then the comment.
     */
    validate(userId, content);

    const foundComment = this.index.get(postId)?.find((comment) => {
      return comment.id === commentId;
    });

    if (!foundComment)
      throw new NotFoundError("Comment id entered non existent");

    const newReply = new reply(postId, commentId, userId, content);
    foundComment.addReply(newReply);
    return {
      id: newReply.id,
      post_id: newReply.post_id,
      comment_id: newReply.comment_id,
      user_id: newReply.user_id,
      content: newReply.content,
      created_at: newReply.created_at,
    };
  }

  getComments(postId) {
    // Return an isolated snapshot of this post's complete discussion.
    if (!postId) throw new ValidationError("post id non existent");
    const comments = this.index.get(postId);
    if (!comments) {
      return [];
    }
    return comments?.map((comment) => ({
      id: comment.id,
      post_id: comment.postId,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      replies: [...comment.replies],
    }));
  }
}
