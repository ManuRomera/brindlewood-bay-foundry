import test from 'node:test';
import assert from 'node:assert/strict';
import {caseBookPlacement} from '../module/case-book-layout.mjs';
import {syncCaseBooks} from '../module/salon-scene.mjs';

test('all six case spines remain visible and clear of the central book', () => {
  const books = Array.from({length:6},(_,i)=>caseBookPlacement(i));
  for(const book of books){
    assert.ok(book.x >= 0 && book.y >= 0);
    assert.ok(book.x + book.width < 570, 'central book starts at x=570');
    assert.ok(book.y + book.height <= 941);
    assert.equal(book.width / book.height, 440 / 170);
  }
  for(let i=1;i<6;i++){
    // The highest point of a lower spine is below the upper book bottom.
    assert.equal(books[i-1].y - books[i].y,35);
    assert.ok(books[i].y + 135 <= books[i-1].y + 100);
  }
  const scaled = caseBookPlacement(5,3344,1882);
  assert.equal(scaled.width,880);
  assert.equal(scaled.y,books[5].y*2);
});

test('existing worlds migrate dimensions and positions without touching decorative tiles', async () => {
  const previousGame = globalThis.game;
  try {
    const tiles = Array.from({length:6},(_,i)=>({id:`tile${i}`,getFlag:()=>`case${i}`}));
    tiles.push({id:'personal-decoration',getFlag:()=>undefined});
    let updates;
    const scene={width:1672,height:941,tiles,updateEmbeddedDocuments:async(type,data)=>{assert.equal(type,'Tile');updates=data;}};
    for(const count of [0,1,2,6,0]){
      globalThis.game={user:{isGM:true},actors:Array.from({length:count},(_,i)=>({type:'misterio',system:{status:'resolved',sourceId:`case${i}`}}))};
      await syncCaseBooks(scene);
      assert.equal(updates.length,6);
      assert.equal(updates.filter(u=>!u.hidden && u.alpha===1).length,count);
      for(const update of updates){assert.equal(update.width,440);assert.equal(update.height,170);assert.equal(update.rotation,0);}
      assert.ok(!updates.some(u=>u._id==='personal-decoration'));
    }
    globalThis.game.user.isGM=false;
    updates=undefined;
    await syncCaseBooks(scene);
    assert.equal(updates,undefined);
  } finally { globalThis.game=previousGame; }
});
