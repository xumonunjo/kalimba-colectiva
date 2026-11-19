// KALIKO CONCERT - minimal WebSocket relay for Node.js.
// Install: npm install ws
// Start: node kaliko-concierto-servidor.js
const {WebSocketServer,WebSocket}=require('ws');
const port=Number(process.env.PORT)||8080;
const wss=new WebSocketServer({port});
const rooms=new Map();
function send(ws,data){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data))}
function state(room){return {type:'state',allowed:room.allowed,free:room.free,stage:room.stage,phones:room.phones,count:room.guests.size}}
function publish(room){const msg=state(room);if(room.host)send(room.host,msg);for(const ws of room.guests)send(ws,msg)}
function leave(ws){const r=ws.room;if(!r)return;if(r.host===ws){for(const g of r.guests){send(g,{type:'error',message:'Director disconnected'});g.close(1000,'Director disconnected')}rooms.delete(ws.roomId)}else r.guests.delete(ws);ws.room=null;if(rooms.get(ws.roomId)===r)publish(r)}
wss.on('connection',ws=>{ws.on('message',raw=>{if(raw.length>512)return;let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m!=='object')return;
if(m.type==='join'){if(ws.room)return;const id=String(m.room||'').trim().slice(0,24);if(!/^[\w -]{1,24}$/.test(id))return send(ws,{type:'error',message:'Invalid room'});
let r=rooms.get(id);if(m.role==='host'){if(r&&r.host)return send(ws,{type:'error',message:'Room already has a director'});r={host:ws,guests:new Set(),allowed:false,free:false,stage:true,phones:true};rooms.set(id,r)}else if(m.role==='guest'){if(!r)return send(ws,{type:'error',message:'Director is not connected yet'});if(r.guests.size>=50)return send(ws,{type:'error',message:'Room full (50 participants)'});r.guests.add(ws)}else return;ws.room=r;ws.roomId=id;ws.role=m.role;publish(r);return}
const r=ws.room;if(!r)return;
if(m.type==='control'&&r.host===ws&&['allowed','free','stage','phones'].includes(m.key)&&typeof m.value==='boolean'){r[m.key]=m.value;publish(r)}
if(m.type==='note'&&ws.role==='guest'&&r.allowed&&Number.isInteger(m.i)&&m.i>=0&&m.i<17){if(r.stage)send(r.host,{type:'note',i:m.i});if(r.free&&r.phones){for(const guest of r.guests){if(guest!==ws)send(guest,{type:'note',i:m.i})}}}
});ws.on('close',()=>leave(ws));ws.on('error',()=>{});});
console.log(`KALIKO concert relay on port ${port}. Expose securely via wss://`);
