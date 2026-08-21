import assert from 'node:assert/strict'
import test from 'node:test'
import { chatMigrationPermissionOwnerId } from '../src/client/chat-migration.ts'

test('uses the retained Character Card id for migration permission ownership', () => {
  assert.equal(chatMigrationPermissionOwnerId({
    characterId: 'card-0123456789abcdef0123456789abcdef',
    chatCharacterName: '聊天中的名字',
  }), 'card-0123456789abcdef0123456789abcdef')
})

test('uses the imported chat identity when migration has no Character Card', () => {
  assert.equal(chatMigrationPermissionOwnerId({ chatCharacterName: '  角色名字  ' }), '角色名字')
  assert.equal(chatMigrationPermissionOwnerId({ chatCharacterName: '   ' }), '角色会话')
  assert.equal(chatMigrationPermissionOwnerId({}), '角色会话')
})
