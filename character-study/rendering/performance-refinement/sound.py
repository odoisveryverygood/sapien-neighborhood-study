import math,random,wave,struct,pathlib
root=pathlib.Path(__file__).resolve().parents[2];out=root/'outputs/sapien-performance-refined';rate=48000;random.seed(193);slow=fast=0;buf=bytearray()
for i in range(rate*10):
 t=i/rate;n=random.uniform(-1,1);slow+=.014*(n-slow);fast+=.32*(n-fast)
 bed=.0009*slow+.00008*math.sin(2*math.pi*96*t);u=(t-3.65)/1.55;rustle=0
 if 0<u<1:
  env=math.sin(math.pi*u)**.65;flutter=.60+.22*math.sin(u*113)+.18*math.sin(u*347);rustle=(fast-slow)*.052*env*flutter
 for event,amp in [(3.70,.014),(5.18,.009),(7.76,.003)]:
  dt=t-event
  if 0<dt<.09:rustle+=amp*math.exp(-dt*70)*(fast*1.8+.18*math.sin(dt*5200))
 fade=min(1,t/.08,(10-t)/.12);v=(bed+rustle)*fade
 buf.extend(struct.pack('<hh',round(max(-1,min(1,v*.97))*32767),round(max(-1,min(1,v*1.03))*32767)))
with wave.open(str(out/'sound-design.wav'),'wb')as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes(buf)
print('10-second original procedural room tone and paper foley.')
