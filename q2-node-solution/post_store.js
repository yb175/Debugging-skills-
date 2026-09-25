export class PostStore {
  constructor() {
    this.posts = new Map([
      [10, 'Welcome to LeetCode'],
      [20, 'System Design Guide']
    ]);
  }

  exists(postId) {
    return this.posts.has(postId);
  }
}
