const read=document.getElementById('read-guidance');
const stop=document.getElementById('stop-speech');
const larger=document.getElementById('large-text');
const speech=window.speechSynthesis;
read.dataset.speechAvailable=String(Boolean(speech&&window.SpeechSynthesisUtterance));

if(!speech || !window.SpeechSynthesisUtterance){
  read.textContent='Speech reading unavailable in this browser';
  read.disabled=true;
  stop.disabled=true;
}

larger.addEventListener('click',()=>{
  const enabled=document.body.classList.toggle('large-text');
  larger.setAttribute('aria-pressed',String(enabled));
});

read.addEventListener('click',()=>{
  if(!speech || !read.dataset.guidance) return;
  speech.cancel();
  const utterance=new SpeechSynthesisUtterance(read.dataset.guidance);
  utterance.lang=document.getElementById('lang').value;
  utterance.rate=0.9;
  utterance.onend=()=>{stop.disabled=true;};
  utterance.onerror=()=>{stop.disabled=true;};
  stop.disabled=false;
  speech.speak(utterance);
});

stop.addEventListener('click',()=>{
  speech?.cancel();
  stop.disabled=true;
});
