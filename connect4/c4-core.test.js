const C = require('./c4-core.js');
let pass=0, fail=0;
const ok=(cond,msg)=>{ if(cond){pass++;} else {fail++; console.log('  ✗ FAIL:',msg);} };
const eq=(a,b,msg)=>ok(JSON.stringify(a)===JSON.stringify(b),msg+' (got '+JSON.stringify(a)+')');

// --- rules: getDropRow / stacking ---
let b=C.createBoard();
eq(C.getDropRow(b,3),5,'empty col drops to bottom row 5');
b[5][3]=1; eq(C.getDropRow(b,3),4,'stacks on filled bottom');
for(let r=0;r<6;r++) b[r][0]=1;
eq(C.getDropRow(b,0),-1,'full column -> -1');
eq(C.getValidMoves(b),[1,2,3,4,5,6],'valid moves excludes full col 0');
ok(!C.isBoardFull(b),'not full');

// --- win detection, all 4 directions ---
b=C.createBoard(); for(let c=0;c<4;c++) b[5][c]=1;
eq(C.checkWin(b,1),[[5,0],[5,1],[5,2],[5,3]],'horizontal win');
b=C.createBoard(); for(let r=2;r<6;r++) b[r][2]=2;
eq(C.checkWin(b,2),[[2,2],[3,2],[4,2],[5,2]],'vertical win');
b=C.createBoard(); for(let i=0;i<4;i++) b[2+i][i]=1;
eq(C.checkWin(b,1),[[2,0],[3,1],[4,2],[5,3]],'diagonal down-right win');
b=C.createBoard(); for(let i=0;i<4;i++) b[5-i][i]=2;
eq(C.checkWin(b,2),[[5,0],[4,1],[3,2],[2,3]],'diagonal up-right win');
b=C.createBoard(); b[5][0]=1;b[5][1]=1;b[5][2]=1;
ok(C.checkWin(b,1)===null,'three-in-a-row is NOT a win');

// --- immutable applyMove ---
let s=C.createGame();
eq(s.current,C.PLAYER,'yellow (1) starts');
let s2=C.applyMove(s,3);
eq(s.moves.length,0,'original state unchanged (immutable)');
eq(s.board[5][3],C.EMPTY,'original board untouched');
eq(s2.board[5][3],1,'new state has disc at bottom of col3');
eq(s2.current,C.AI,'turn alternates to 2');
eq(s2.moves,[3],'move recorded');
// illegal + post-gameover no-ops
let full=C.createGame(); for(let k=0;k<6;k++) full=C.applyMove(full, k%2);// fill col0/1 alternating
// build a real full column to test illegal
let colFull=C.createGame(); [0,1,0,1,0,1].forEach(c=>colFull=C.applyMove(colFull,0)||colFull);
// (col0 filled by 6 moves all to col0)
let cf=C.createGame(); for(let k=0;k<6;k++) cf=C.applyMove(cf,0);
eq(cf.board.map(r=>r[0]),[2,1,2,1,2,1],'col0 filled alternating (row0=top)');
let cf2=C.applyMove(cf,0);
ok(cf2===cf,'illegal move (full col) is a no-op (same ref)');

// --- known win sequences via applyMove ---
let v=C.replay([0,1,0,1,0,1,0]); // p1 vertical col0
eq(v.status,'won','vertical sequence -> won'); eq(v.winner,1,'winner 1');
eq(v.winningCells.length,4,'4 winning cells');
let h=C.replay([0,6,1,6,2,6,3]); // p1 horizontal row5 cols0-3
eq(h.status,'won','horizontal sequence -> won'); eq(h.winner,1,'winner 1 horiz');
// move after game over = no-op
let after=C.applyMove(v,2); ok(after===v,'move after win is a no-op');

// --- draw ---
const pat=C.createBoard();
for(let r=0;r<6;r++) for(let c=0;c<7;c++) pat[r][c]=((Math.floor(r/2)+c)%2===0)?1:2;
ok(C.checkWin(pat,1)===null && C.checkWin(pat,2)===null,'draw pattern has NO win');
ok(C.isBoardFull(pat),'draw pattern is full');
const dboard=pat.map(r=>r.slice()); dboard[0][6]=C.EMPTY;
const dstate={board:dboard,moves:[],current:1,status:'playing',winner:0,winningCells:null,lastDrop:null};
const drawn=C.applyMove(dstate,6);
eq(drawn.status,'draw','completing full board with no win -> draw');
eq(drawn.winner,0,'draw has no winner');

// --- fuzz: 2000 random self-play games; replay(moves) must reproduce board ---
let games=0,wins=0,draws=0,consistent=0;
for(let g=0; g<2000; g++){
  let st=C.createGame(), guard=0;
  while(st.status==='playing' && guard++<50){
    const lm=C.getValidMoves(st.board);
    st=C.applyMove(st, lm[(g*7+guard*3)%lm.length]); // deterministic pseudo-random
  }
  games++;
  if(st.status==='won')wins++; else if(st.status==='draw')draws++;
  const rep=C.replay(st.moves);
  if(JSON.stringify(rep.board)===JSON.stringify(st.board) &&
     rep.status===st.status && rep.winner===st.winner) consistent++;
}
eq(consistent,games,'replay(moves) reproduces every game state exactly ('+games+' games)');
console.log('  fuzz: '+games+' games, '+wins+' wins, '+draws+' draws');

console.log('\n'+(fail===0?'✅ ALL '+pass+' ASSERTIONS PASS':'❌ '+fail+' FAILED ('+pass+' passed)'));
process.exit(fail?1:0);
