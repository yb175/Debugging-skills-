import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function json(response) {
  return response.json();
}

async function main() {
  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);

    const initial = await fetch(`${baseUrl}/post/10/comments`);
    assert.deepEqual(await json(initial), [], 'Server state is not fresh. Restart server before running test_client.js');

    const c1Response = await fetch(`${baseUrl}/post/10/comment/add`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'u1', content: 'First comment' })
    });
    assert.equal(c1Response.status, 201, await c1Response.text());
    const c1 = await json(c1Response);

    const c2Response = await fetch(`${baseUrl}/post/10/comment/add`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'u2', content: 'Second comment' })
    });
    assert.equal(c2Response.status, 201, await c2Response.text());
    const c2 = await json(c2Response);

    const r1Response = await fetch(`${baseUrl}/post/10/comment/${c1.id}/reply`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'u3', content: 'First reply' })
    });
    assert.equal(r1Response.status, 201, await r1Response.text());
    const r1 = await json(r1Response);

    const r2Response = await fetch(`${baseUrl}/post/10/comment/${c1.id}/reply`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'u4', content: 'Second reply' })
    });
    assert.equal(r2Response.status, 201, await r2Response.text());
    const r2 = await json(r2Response);

    const tree = await json(await fetch(`${baseUrl}/post/10/comments`));
    assert.equal(tree.length, 2);
    assert.equal(tree[0].id, c1.id);
    assert.equal(tree[1].id, c2.id);
    assert.equal(tree[0].replies.length, 2);
    assert.equal(tree[0].replies[0].id, r1.id);
    assert.equal(tree[0].replies[1].id, r2.id);
    assert.deepEqual(tree[1].replies, []);

    const post20 = await fetch(`${baseUrl}/post/20/comments`);
    assert.deepEqual(await json(post20), []);

    const wrongPost = await fetch(`${baseUrl}/post/20/comment/${c1.id}/reply`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'u5', content: 'wrong post' })
    });
    assert.equal(wrongPost.status, 404);

    const emptyUser = await fetch(`${baseUrl}/post/10/comment/add`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: '', content: 'bad' })
    });
    assert.equal(emptyUser.status, 400);

    const missingPost = await fetch(`${baseUrl}/post/999/comment/add`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'u1', content: 'bad' })
    });
    assert.equal(missingPost.status, 404);

    console.log('ALL TESTS PASSED');
  } catch (error) {
    console.error(`TEST FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
