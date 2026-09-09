import type { Side } from '../shared/types';
import { net } from './net';
import { SIDE_COLOR } from './render/pieces';
import { clearSession, store } from './store';

const SEAT_ORDER: Side[] = ['red', 'blue', 'green', 'black'];
const SIDE_NAME: Record<Side, string> = { red: '红·晋', blue: '蓝·齐', green: '绿·楚', black: '黑·秦' };

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function initHud(): void {
  const panel = el<HTMLElement>('panel');
  const banner = el<HTMLElement>('banner');
  const conn = el<HTMLElement>('conn');
  const tray = el<HTMLElement>('tray');
  const toast = el<HTMLElement>('toast');
  const overlay = el<HTMLElement>('overlay');
  let toastTimer = 0;
  let overlayShown = false;

  panel.addEventListener('click', onClick);
  store.subscribe(render);
  render();

  function onClick(e: Event): void {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!t) return;
    const seat = t.dataset.seat as Side | undefined;
    switch (t.dataset.action) {
      case 'create': {
        const name = inputVal('pname');
        const sel = inputVal('pseat');
        net.send({ t: 'room.create', name: name || '玩家', seat: sel ? (sel as Side) : undefined });
        break;
      }
      case 'join': {
        const code = inputVal('pcode').toUpperCase();
        if (code.length !== 4) { show('请输入 4 位房间码'); break; }
        const sel = inputVal('pseat');
        net.send({ t: 'room.join', code, name: inputVal('pname') || '玩家', seat: sel ? (sel as Side) : undefined });
        break;
      }
      case 'claim':
        if (seat) net.send({ t: 'seat.claim', seat });
        break;
      case 'start':
        net.send({ t: 'room.start' });
        break;
      case 'leave':
        net.send({ t: 'room.leave' });
        clearSession();
        break;
      case 'copy':
        void navigator.clipboard?.writeText(location.href).then(() => show('邀请链接已复制'));
        break;
      case 'dismiss':
        overlay.classList.add('hidden');
        break;
      case 'reload':
        clearSession();
        location.reload();
        break;
    }
  }

  function inputVal(id: string): string {
    return (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value.trim() ?? '';
  }

  function show(text: string): void {
    toast.textContent = text;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.add('hidden'), 3000);
  }

  function seatRows(): string {
    const room = store.state.room!;
    return SEAT_ORDER.map((side) => {
      const seat = room.seats.find((s) => s.side === side);
      const status = !seat ? '空闲' : seat.ai ? 'AI 代下' : seat.connected ? '在线' : '离线（可重连）';
      const label = `${SIDE_NAME[side]}${seat?.isHost ? '（房主）' : ''}${seat ? ` · ${seat.name}` : ''} · ${status}`;
      const mine = side === room.you.side ? ' me' : '';
      const canClaim = !seat || (seat.ai && side !== room.you.side);
      const btn = canClaim
        ? `<button data-action="claim" data-seat="${side}">${seat ? '接管' : '入座'}</button>`
        : '';
      return `<div class="seat${mine}"><span>${label}</span>${btn}</div>`;
    }).join('');
  }

  function renderPanel(): void {
    const st = store.state;
    const room = st.room;
    if (!room) {
      panel.innerHTML = `<h2>加入对局</h2>
        <div class="row"><label>昵称</label><input id="pname" maxlength="12" placeholder="玩家" /></div>
        <div class="row"><label>座位</label><select id="pseat"><option value="">自动</option>${SEAT_ORDER.map((s) => `<option value="${s}">${SIDE_NAME[s]}</option>`).join('')}</select></div>
        <div class="row"><button data-action="create">创建房间</button></div>
        <div class="row"><label>房间码</label><input id="pcode" maxlength="4" placeholder="如 K3F2" /></div>
        <div class="row"><button data-action="join">加入房间</button></div>
        <p class="hint">红蓝绿黑四国各自为战：国名子被吃即淘汰，最后存活的一家获胜。凑不齐四人时空位由 AI 代下，之后可随时接管。</p>`;
      return;
    }
    const isHost = room.seats.some((s) => s.isHost && s.side === room.you.side);
    const startBtn = room.phase === 'lobby'
      ? `<button data-action="start" ${isHost ? '' : 'disabled title="只有房主可开局"'}>开始对局</button>`
      : '';
    panel.innerHTML = `<h2>房间 <span class="code" data-action="copy" title="点击复制邀请链接">${room.code}</span></h2>
      ${seatRows()}
      <div class="row">${startBtn}<button class="ghost" data-action="leave">离开</button></div>
      <p class="hint">${room.phase === 'lobby'
        ? '把本页链接发给同局域网的朋友即可加入。'
        : '轮到你时：点自己的棋子 → 点目标点（绿点=移动，红圈=吃子）。断线刷新可回到本座位。'}</p>`;
  }

  function render(): void {
    const st = store.state;
    conn.textContent = st.connected ? '' : '连接服务器中…';
    if (!st.room) banner.textContent = '创建房间或输入房间码开始对局';
    else if (st.room.phase === 'lobby') banner.textContent = `等待开局 · 已入座 ${st.room.seats.length}/4`;
    else if (st.game?.over) banner.textContent = '对局结束';
    else if (st.game) banner.textContent = `轮到 ${SIDE_NAME[st.game.turn]}${st.game.turn === st.mySide ? ' —— 请你走子' : ''}`;
    renderPanel();
    tray.innerHTML = st.captured.length
      ? `被吃：${st.captured.map((p) => `<span class="cap" style="background:${SIDE_COLOR[p.side]}">${p.ch}</span>`).join('')}`
      : '';
    if (st.notice) { show(st.notice); store.set({ notice: null }); }
    if (st.over && !overlayShown) {
      overlayShown = true;
      const title = st.over.winner === 'draw' ? '和棋' : `${SIDE_NAME[st.over.winner]} 获胜！`;
      overlay.innerHTML = `<div class="card"><h2>${title}</h2><p>${st.over.reason}</p>
        <div class="row" style="justify-content:center"><button class="ghost" data-action="dismiss">查看棋盘</button><button data-action="reload">再来一局</button></div></div>`;
      overlay.classList.remove('hidden');
      overlay.addEventListener('click', onClickOnce);
    }
    if (!st.over && overlayShown) { overlayShown = false; overlay.classList.add('hidden'); }
  }

  function onClickOnce(e: Event): void {
    onClick(e);
    if ((e.target as HTMLElement).closest('[data-action="dismiss"]')) {
      overlay.removeEventListener('click', onClickOnce);
    }
  }
}
