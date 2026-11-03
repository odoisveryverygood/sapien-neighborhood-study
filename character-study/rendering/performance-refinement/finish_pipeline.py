from pathlib import Path
import subprocess,json,sys,time
R=Path(__file__).resolve().parents[2];W=R/'rendering/performance-refinement';O=R/'outputs/sapien-performance-refined'
B=__import__('os').environ.get('BLENDER_BIN','blender');state_path=O/'pipeline-state.json'
def state(stage,**details):
 state_path.write_text(json.dumps({'stage':stage,**details},indent=2));print(stage,details,flush=True)
def run(cmd,log):
 with(W/log).open('w')as f:subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,check=True,cwd=R)
try:
 for i in range(3):
  m=json.loads((O/'render-manifest.json').read_text())
  if len(m['chunks'])==20 and len(m['frames'])==240:break
  state('baseline',batch=i+1)
  run([B,'-b','--disable-autoexec','--python-exit-code','2','--python',str(W/'render_master.py'),'--','--one-chunk'],f'final-baseline-{i+1}.log')
 m=json.loads((O/'render-manifest.json').read_text())
 if len(m['chunks'])!=20 or len(m['frames'])!=240:raise RuntimeError('Baseline remains incomplete')
 state('assembling baseline');run([sys.executable,str(W/'assemble_review.py')],'baseline-assembly.log')
 for i in range(4):
  state('hand refinement',batch=i+1)
  run([B,'-b','--disable-autoexec','--python-exit-code','2','--python',str(W/'relax_hand.py'),'--','--one-batch'],f'hand-batch-{i+1}.log')
 patches=list((O/'hand-patches').glob('*.png'))
 if len(patches)!=48:raise RuntimeError('Missing hand-refinement frames')
 state('compositing refinement');run([sys.executable,str(W/'composite_hand.py')],'hand-composite.log')
 state('assembling final');run([sys.executable,str(W/'assemble_review.py')],'final-assembly.log')
 state('ready for browser verification')
except BaseException as e:
 state('needs inspection',error=str(e));raise
