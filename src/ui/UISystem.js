// src/ui/UISystem.js
export default class UISystem{
  constructor(){ this.hudLine = document.getElementById('hudLine'); this.overlay = document.getElementById('centerOverlay'); this.title = document.getElementById('centerTitle'); this.text = document.getElementById('centerText'); this.startBtn = document.getElementById('startBtn'); this.optionsBtn = document.getElementById('optionsBtn'); }
  show(title,html,showButton=true){ if (this.title) this.title.textContent = title; if (this.text) this.text.innerHTML = html; if (this.overlay) this.overlay.style.display='block'; if (this.startBtn) this.startBtn.style.display = showButton? 'inline-block':'none'; }
  hide(){ if (this.overlay) this.overlay.style.display='none'; }
  setHud(text){ if (this.hudLine) this.hudLine.textContent = text; }
}
