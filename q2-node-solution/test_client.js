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
    const c1Text = await c1Response.text();
    assert.equal(c1Response.status, 201, c1Text);
    const c1 = JSON.parse(c1Text);

    const c2Response = await fetch(`${baseUrl}/post/10/comment/add`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'u2', content: 'Second comment' })
    });
    const c2Text = await c2Response.text();
    assert.equal(c2Response.status, 201, c2Text);
    const c2 = JSON.parse(c2Text);

    const r1Response = await fetch(`${baseUrl}/post/10/comment/${c1.id}/reply`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'u3', content: 'First reply' })
    });
    const r1Text = await r1Response.text();
    assert.equal(r1Response.status, 201, r1Text);
    const r1 = JSON.parse(r1Text);

    const r2Response = await fetch(`${baseUrl}/post/10/comment/${c1.id}/reply`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'u4', content: 'Second reply' })
    });
    const r2Text = await r2Response.text();
    assert.equal(r2Response.status, 201, r2Text);
    const r2 = JSON.parse(r2Text);

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
